/**
 * Seat registry storage. Ported from memcoinz
 * `.claude/skills/launchpad-site/preset-seats/lib/store.ts`, `store.file.ts`
 * and `store.supabase.ts` (minus the launch "pending" table: CLONE has no
 * launch flow, the $CLONE coin record comes from env via ensureCoin()).
 *
 * SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY set → Supabase `seat_coins`
 * (versioned jsonb, optimistic locking; safe on Vercel / many instances).
 * Otherwise → JSON files in SEATS_DATA_DIR (default <CLONE_DATA_DIR>/seats).
 */

import fs from "node:fs/promises";
import path from "node:path";

import { supabaseEnv, supabaseRest, versionedDocs } from "../supabase";
import { tokenConfig } from "./config";
import { newCoin, type SeatCoin } from "./core";

export interface SeatStore {
  getCoin(mint: string): Promise<SeatCoin | null>;
  /** Atomic read-modify-write: `fn` mutates the coin; its return value passes through. */
  updateCoin<T>(mint: string, fn: (coin: SeatCoin) => T): Promise<T>;
  /** Insert if absent (idempotent). */
  createCoin(coin: SeatCoin): Promise<void>;
}

const MINT_SHAPE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const safe = (mint: string) => {
  if (!MINT_SHAPE.test(mint)) throw new Error("bad mint");
  return mint;
};

// --- file backend ----------------------------------------------------------------

const dir = () =>
  process.env.SEATS_DATA_DIR ?? path.join(process.env.CLONE_DATA_DIR ?? path.join(process.cwd(), ".data"), "seats");
const coinFile = (mint: string) => path.join(dir(), "coins", `${safe(mint)}.json`);

const locks = new Map<string, Promise<unknown>>();

/** Serialises read-modify-write per key so two claims can't take the same seat. */
function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(key) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  locks.set(key, next.catch(() => undefined));
  return next;
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function writeJson(file: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 1));
  await fs.rename(tmp, file); // atomic: readers never see a half-written file
}

export const fileSeatStore: SeatStore = {
  getCoin: (mint) => readJson<SeatCoin>(coinFile(mint)),
  updateCoin<T>(mint: string, fn: (coin: SeatCoin) => T): Promise<T> {
    return withLock(mint, async () => {
      const coin = await readJson<SeatCoin>(coinFile(mint));
      if (!coin) throw new Error("Unknown coin");
      const out = fn(coin);
      await writeJson(coinFile(mint), coin);
      return out;
    });
  },
  createCoin: (coin) =>
    withLock(coin.mint, async () => {
      if (await readJson(coinFile(coin.mint))) return;
      await writeJson(coinFile(coin.mint), coin);
    }),
};

// --- supabase backend ------------------------------------------------------------

export function supabaseSeatStore(fetchImpl: typeof fetch = fetch): SeatStore | null {
  const env = supabaseEnv();
  if (!env) return null;
  const docs = versionedDocs<SeatCoin>(supabaseRest(env, fetchImpl), "seat_coins", "mint");
  return {
    getCoin: (mint) => docs.get(safe(mint)),
    async updateCoin(mint, fn) {
      try {
        return await docs.update(safe(mint), (coin) => ({ value: fn(coin), write: true }));
      } catch (error) {
        if ((error as Error).message === "Unknown key") throw new Error("Unknown coin");
        throw error;
      }
    },
    createCoin: (coin) => docs.insert(safe(coin.mint), coin),
  };
}

export function seatStore(): SeatStore {
  return supabaseSeatStore() ?? fileSeatStore;
}

/**
 * The $CLONE seat record, created on first use from env (idempotent: an
 * existing record always wins, so later env edits never reset the seats).
 * null while the token is not configured.
 */
export async function ensureCoin(store: SeatStore = seatStore()): Promise<SeatCoin | null> {
  const result = tokenConfig();
  if (!result.ok) return null;
  const { config } = result;
  const existing = await store.getCoin(config.mint);
  if (existing) return existing;
  await store.createCoin(
    newCoin({
      mint: config.mint,
      creator: config.creator,
      name: config.name,
      symbol: config.symbol,
      image: null,
      seatCap: config.seatCap,
      minHold: config.minHold,
    }),
  );
  return store.getCoin(config.mint);
}
