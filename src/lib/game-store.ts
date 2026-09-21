import { promises as fs } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";

import {
  MAX_LEVERAGE,
  MAX_OPEN_POSITIONS,
  MIN_MARGIN,
  STARTING_BALANCE,
  equity,
  isLiquidated,
  liquidationPrice,
  periodKey,
  positionPnl,
  round2,
  type Account,
  type ClosedTrade,
  type Period,
  type Position,
  type Side,
} from "./game";

/**
 * Account persistence: one JSON document, written atomically, reloaded when
 * the file changes underneath (Next bundles route handlers separately from
 * page renderers, so several copies of this module coexist — the same lesson
 * the market cache taught earlier in this repo's history).
 *
 * On serverless hosts the filesystem is ephemeral; production should point
 * HOODST_DATA_DIR at mounted storage or reimplement this module on a database.
 */

const DATA_DIR = process.env.HOODST_DATA_DIR ?? path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "game.json");

type AccountMap = Map<string, Account>;

let cache: AccountMap | null = null;
let cacheStamp: string | null = null;
let loading: Promise<AccountMap> | null = null;
let writeQueue: Promise<unknown> = Promise.resolve();

async function fileStamp(): Promise<string | null> {
  try {
    const info = await fs.stat(DATA_FILE);
    return `${info.mtimeMs}:${info.size}`;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function persist(map: AccountMap): Promise<void> {
  const body = `${JSON.stringify({ version: 1, accounts: [...map.values()] }, null, 2)}\n`;
  const temp = `${DATA_FILE}.${process.pid}.tmp`;
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(temp, body, "utf8");
  await fs.rename(temp, DATA_FILE);
  cacheStamp = await fileStamp();
}

function enqueueWrite(map: AccountMap): Promise<void> {
  const next = writeQueue.then(() => persist(map));
  writeQueue = next.catch(() => {});
  return next;
}

async function load(): Promise<AccountMap> {
  const stamp = await fileStamp();
  if (cache && cacheStamp !== null && stamp === cacheStamp) return cache;

  if (!loading) {
    loading = (async () => {
      try {
        const raw = await fs.readFile(DATA_FILE, "utf8");
        const parsed = JSON.parse(raw) as { accounts?: Account[] };
        cache = new Map((parsed.accounts ?? []).map((account) => [account.wallet, account]));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          console.error("[hoodst] could not read the game file, starting empty", error);
        }
        cache = new Map();
      }
      cacheStamp = await fileStamp();
      return cache;
    })().finally(() => {
      loading = null;
    });
  }
  return loading;
}

/* --- mark to market ---------------------------------------------------------
   Applied on every read: refresh period baselines at UTC boundaries and settle
   any position whose loss has reached its margin. Returns true when the
   account changed and needs persisting. */

function rollPeriods(account: Account, prices: Map<string, number>, now: Date): boolean {
  let changed = false;
  const equityNow = equity(account, prices);
  for (const period of ["daily", "weekly", "monthly"] as Period[]) {
    const key = periodKey(period, now);
    if (account.periods[period].key !== key) {
      account.periods[period] = { key, equity: equityNow };
      changed = true;
    }
  }
  return changed;
}

function settleLiquidations(account: Account, prices: Map<string, number>, now: Date): boolean {
  let changed = false;
  const survivors: Position[] = [];
  for (const position of account.positions) {
    const price = prices.get(position.tokenAddress);
    if (price !== undefined && isLiquidated(position, price)) {
      // Settled exactly at the liquidation price: the margin is gone, no more.
      account.history.unshift({
        ...position,
        exitPrice: liquidationPrice(position),
        pnlUsd: -position.marginUsd,
        closedAt: now.toISOString(),
        reason: "liquidated",
      });
      changed = true;
    } else {
      survivors.push(position);
    }
  }
  account.positions = survivors;
  account.history = account.history.slice(0, 100);
  return changed;
}

function markAccount(account: Account, prices: Map<string, number>, now: Date): boolean {
  const liquidated = settleLiquidations(account, prices, now);
  const rolled = rollPeriods(account, prices, now);
  return liquidated || rolled;
}

/* --- public operations ------------------------------------------------------ */

function newAccount(wallet: string, now: Date): Account {
  const start = { equity: STARTING_BALANCE };
  return {
    wallet,
    createdAt: now.toISOString(),
    balance: STARTING_BALANCE,
    positions: [],
    history: [],
    periods: {
      daily: { key: periodKey("daily", now), ...start },
      weekly: { key: periodKey("weekly", now), ...start },
      monthly: { key: periodKey("monthly", now), ...start },
    },
    held: null,
  };
}

export async function getOrCreateAccount(
  wallet: string,
  prices: Map<string, number>,
  now = new Date(),
): Promise<Account> {
  const map = await load();
  let account = map.get(wallet);
  let changed = false;

  if (!account) {
    account = newAccount(wallet, now);
    map.set(wallet, account);
    changed = true;
  }
  if (markAccount(account, prices, now)) changed = true;
  if (changed) await enqueueWrite(map);
  return account;
}

export async function recordHolding(wallet: string, amount: number, now = new Date()): Promise<void> {
  const map = await load();
  const account = map.get(wallet);
  if (!account) return;
  account.held = { amount, checkedAt: now.toISOString() };
  await enqueueWrite(map);
}

export type TradeResult =
  | { ok: true; account: Account; position?: Position; trade?: ClosedTrade }
  | { ok: false; error: string };

export async function openPosition(
  wallet: string,
  input: { tokenAddress: string; symbol: string; side: Side; marginUsd: number; leverage: number },
  prices: Map<string, number>,
  now = new Date(),
): Promise<TradeResult> {
  const { tokenAddress, symbol, side, marginUsd, leverage } = input;

  if (side !== "long" && side !== "short") return { ok: false, error: "side must be long or short" };
  if (!Number.isFinite(marginUsd) || marginUsd < MIN_MARGIN) {
    return { ok: false, error: `margin must be at least $${MIN_MARGIN}` };
  }
  if (!Number.isInteger(leverage) || leverage < 1 || leverage > MAX_LEVERAGE) {
    return { ok: false, error: `leverage must be a whole number from 1 to ${MAX_LEVERAGE}` };
  }

  const entryPrice = prices.get(tokenAddress);
  if (entryPrice === undefined || entryPrice <= 0) {
    return { ok: false, error: "no live price for that token right now — nothing to fill against" };
  }

  const account = await getOrCreateAccount(wallet, prices, now);
  const map = await load();

  if (account.positions.length >= MAX_OPEN_POSITIONS) {
    return { ok: false, error: `at most ${MAX_OPEN_POSITIONS} open positions` };
  }
  if (marginUsd > account.balance) {
    return { ok: false, error: `margin exceeds free balance ($${account.balance.toFixed(2)})` };
  }

  const marginCents = round2(marginUsd);
  const position: Position = {
    id: randomBytes(8).toString("hex"),
    tokenAddress,
    symbol: symbol.toUpperCase().replace(/^\$+/, "").slice(0, 12) || "?",
    side,
    marginUsd: marginCents,
    leverage,
    entryPrice,
    openedAt: now.toISOString(),
  };

  account.balance = round2(account.balance - marginCents);
  account.positions.push(position);
  await enqueueWrite(map);
  return { ok: true, account, position };
}

export async function closePosition(
  wallet: string,
  positionId: string,
  prices: Map<string, number>,
  now = new Date(),
): Promise<TradeResult> {
  const account = await getOrCreateAccount(wallet, prices, now);
  const map = await load();

  const position = account.positions.find((candidate) => candidate.id === positionId);
  if (!position) return { ok: false, error: "no open position with that id (it may have liquidated)" };

  const price = prices.get(position.tokenAddress);
  if (price === undefined || price <= 0) {
    return { ok: false, error: "no live price for that token right now — cannot fill the close" };
  }

  const pnlUsd = round2(positionPnl(position, price));
  const trade: ClosedTrade = {
    ...position,
    exitPrice: price,
    pnlUsd,
    closedAt: now.toISOString(),
    reason: "closed",
  };

  account.positions = account.positions.filter((candidate) => candidate.id !== positionId);
  account.balance = round2(account.balance + position.marginUsd + pnlUsd);
  account.history.unshift(trade);
  account.history = account.history.slice(0, 100);
  await enqueueWrite(map);
  return { ok: true, account, trade };
}

export async function accountCount(): Promise<number> {
  return (await load()).size;
}

/** Every open position's token, for pricing. */
export async function allHeldTokens(): Promise<string[]> {
  const map = await load();
  const tokens = new Set<string>();
  for (const account of map.values()) {
    for (const position of account.positions) tokens.add(position.tokenAddress);
  }
  return [...tokens];
}

export interface LeaderboardRow {
  wallet: string;
  equity: number;
  periodReturn: number;
  openPositions: number;
  heldAmount: number | null;
}

export async function leaderboard(
  period: Period,
  prices: Map<string, number>,
  now = new Date(),
  limit = 50,
): Promise<LeaderboardRow[]> {
  const map = await load();
  let changed = false;

  const rows: LeaderboardRow[] = [];
  for (const account of map.values()) {
    if (markAccount(account, prices, now)) changed = true;
    const equityNow = equity(account, prices);
    const start = account.periods[period];
    rows.push({
      wallet: account.wallet,
      equity: equityNow,
      periodReturn: start.equity > 0 ? equityNow / start.equity - 1 : 0,
      openPositions: account.positions.length,
      heldAmount: account.held?.amount ?? null,
    });
  }

  if (changed) await enqueueWrite(map);
  return rows.sort((a, b) => b.periodReturn - a.periodReturn).slice(0, limit);
}
