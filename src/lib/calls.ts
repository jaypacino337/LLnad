import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * The call record: a small append-oriented JSON store, written atomically.
 * Calls enter only through the admin API, start with a recorded entry market
 * cap, and are refreshed from the market source on read. It ships empty — a
 * track record seeded with entries would be worthless.
 *
 * Persistence note: on serverless hosts the filesystem is ephemeral, so a
 * production deployment should point PUMPXBT_DATA_DIR at mounted storage (or
 * this module should be reimplemented against a database). Documented in the
 * README rather than hidden.
 */

const DATA_DIR = process.env.PUMPXBT_DATA_DIR ?? path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "calls.json");
/** Refresh from the market source at most this often. */
const REFRESH_TTL_MS = 60_000;

export interface Call {
  id: string;
  symbol: string;
  tokenAddress: string;
  calledAt: string;
  entryMarketCap: number;
  currentMarketCap: number | null;
  peakMarketCap: number | null;
  lastRefreshedAt: string | null;
  status: "open" | "closed";
}

export interface NewCall {
  symbol: string;
  tokenAddress: string;
  entryMarketCap: number;
}

let writeQueue: Promise<unknown> = Promise.resolve();
let lastRefreshAt = 0;

async function readAll(): Promise<Call[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as { calls?: Call[] };
    return Array.isArray(parsed.calls) ? parsed.calls : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function persist(calls: Call[]): Promise<void> {
  const body = `${JSON.stringify({ version: 1, calls }, null, 2)}\n`;
  const temp = `${DATA_FILE}.${process.pid}.tmp`;
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(temp, body, "utf8");
  await fs.rename(temp, DATA_FILE);
}

function enqueue(calls: Call[]): Promise<void> {
  const next = writeQueue.then(() => persist(calls));
  writeQueue = next.catch(() => {});
  return next;
}

/** Best-effort market-cap refresh for open calls. Failures leave stored values. */
async function refresh(calls: Call[]): Promise<Call[]> {
  const open = calls.filter((call) => call.status === "open");
  if (open.length === 0 || Date.now() - lastRefreshAt < REFRESH_TTL_MS) return calls;
  lastRefreshAt = Date.now();

  try {
    const addresses = [...new Set(open.map((call) => call.tokenAddress))].slice(0, 30);
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${addresses.join(",")}`,
      { headers: { accept: "application/json" }, signal: AbortSignal.timeout(9_000), cache: "no-store" },
    );
    if (!response.ok) return calls;

    const payload = (await response.json()) as {
      pairs?: Array<{ baseToken?: { address?: string }; marketCap?: number; fdv?: number; liquidity?: { usd?: number } }>;
    };
    const best = new Map<string, number>();
    for (const pair of payload.pairs ?? []) {
      const address = pair.baseToken?.address;
      const cap = pair.marketCap ?? pair.fdv;
      if (!address || typeof cap !== "number") continue;
      // Deepest pair wins, mirroring the market module.
      const held = best.get(address);
      if (held === undefined || (pair.liquidity?.usd ?? 0) > 0) best.set(address, cap);
      void held;
    }

    const now = new Date().toISOString();
    const updated = calls.map((call) => {
      const cap = best.get(call.tokenAddress);
      if (call.status !== "open" || cap === undefined) return call;
      return {
        ...call,
        currentMarketCap: cap,
        peakMarketCap: Math.max(call.peakMarketCap ?? 0, cap),
        lastRefreshedAt: now,
      };
    });

    await enqueue(updated).catch(() => {});
    return updated;
  } catch {
    return calls;
  }
}

/** Newest first, refreshed when the market source is reachable. */
export async function getCalls(): Promise<Call[]> {
  const calls = await refresh(await readAll());
  return [...calls].sort((a, b) => b.calledAt.localeCompare(a.calledAt));
}

export type PublishResult =
  | { ok: true; call: Call }
  | { ok: false; error: string };

export async function publishCall(input: NewCall, calledAt = new Date()): Promise<PublishResult> {
  const symbol = input.symbol?.trim().toUpperCase().replace(/^\$+/, "").slice(0, 12);
  const tokenAddress = input.tokenAddress?.trim();
  const entryMarketCap = input.entryMarketCap;

  if (!symbol) return { ok: false, error: "symbol is required" };
  if (!tokenAddress || tokenAddress.length < 30 || tokenAddress.length > 50) {
    return { ok: false, error: "tokenAddress must be a Solana address" };
  }
  if (!Number.isFinite(entryMarketCap) || entryMarketCap <= 0) {
    return { ok: false, error: "entryMarketCap must be a positive number" };
  }

  const calls = await readAll();
  if (calls.some((call) => call.tokenAddress === tokenAddress && call.status === "open")) {
    return { ok: false, error: "an open call for this token already exists" };
  }

  const call: Call = {
    id: `${tokenAddress.slice(0, 8)}-${calledAt.getTime()}`,
    symbol,
    tokenAddress,
    calledAt: calledAt.toISOString(),
    entryMarketCap,
    currentMarketCap: null,
    peakMarketCap: null,
    lastRefreshedAt: null,
    status: "open",
  };

  calls.push(call);
  await enqueue(calls);
  return { ok: true, call };
}

export async function closeCall(id: string): Promise<PublishResult> {
  const calls = await readAll();
  const index = calls.findIndex((call) => call.id === id);
  if (index === -1) return { ok: false, error: "no call with that id" };
  if (calls[index].status === "closed") return { ok: false, error: "call is already closed" };

  calls[index] = { ...calls[index], status: "closed" };
  await enqueue(calls);
  return { ok: true, call: calls[index] };
}

export function callMultiple(call: Call): number | null {
  if (!call.currentMarketCap || call.entryMarketCap <= 0) return null;
  return call.currentMarketCap / call.entryMarketCap;
}
