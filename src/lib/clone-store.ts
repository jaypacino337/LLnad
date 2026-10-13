/**
 * Durable city state: which tokens were summoned, and the Overheard feed.
 *
 * Two backends, chosen by env on every call (same switch as the memcoinz seats
 * store, `preset-seats/lib/store.ts`):
 *  - SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY set → one versioned jsonb row in
 *    `clone_city` (supabase/schema.sql). Optimistic locking on `version`, so
 *    any number of serverless instances can write without losing summons.
 *    This is what production on Vercel needs: the disk there is ephemeral.
 *  - otherwise → a JSON file with atomic writes (tmp + rename) behind a
 *    serialized queue, for local dev or a host with a persistent disk
 *    (CLONE_DATA_DIR). Next bundles route handlers and page renderers as
 *    separate module instances, so every read re-checks the file stamp
 *    (mtime + size) and reloads when another instance wrote.
 */

import { mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import { supabaseEnv, supabaseRest, versionedDocs } from "./supabase";

export interface SummonedClone {
  mint: string;
  symbol: string;
  name: string;
  dexId: string;
  summonedAt: string;
}

export type FeedKind = "speech" | "summon" | "wake" | "sleep";

export interface FeedEntry {
  at: number;
  kind: FeedKind;
  mint: string;
  symbol: string;
  /** Speech only. */
  text?: string;
  place?: string;
  mind?: "rules" | "claude";
}

interface CityState {
  summoned: SummonedClone[];
  feed: FeedEntry[];
  /** Last speech bucket each clone spoke in, so a bucket speaks once. */
  spoken: Record<string, number>;
  /** Last observed awake state, so wake/sleep transitions become feed events. */
  awake: Record<string, boolean>;
}

const EMPTY: CityState = { summoned: [], feed: [], spoken: {}, awake: {} };

export const MAX_SUMMONED = 60;
export const MAX_FEED = 120;

function normalize(raw: Partial<CityState> | null | undefined): CityState {
  if (!raw || typeof raw !== "object") return structuredClone(EMPTY);
  return {
    summoned: Array.isArray(raw.summoned) ? raw.summoned : [],
    feed: Array.isArray(raw.feed) ? raw.feed : [],
    spoken: raw.spoken && typeof raw.spoken === "object" ? raw.spoken : {},
    awake: raw.awake && typeof raw.awake === "object" ? raw.awake : {},
  };
}

/** A mutation returns its result and whether anything changed (no-op rounds skip the write). */
type Mutation<T> = (state: CityState) => { value: T; write: boolean };

interface CityBackend {
  read(): Promise<CityState>;
  mutate<T>(fn: Mutation<T>): Promise<T>;
}

// --- file backend --------------------------------------------------------------

function dataDir(): string {
  return process.env.CLONE_DATA_DIR ?? path.join(process.cwd(), ".data");
}

function dataFile(): string {
  return path.join(dataDir(), "city.json");
}

let cached: { state: CityState; stamp: string; file: string } | null = null;

function fileStamp(): string {
  try {
    const stat = statSync(dataFile());
    return `${stat.mtimeMs}:${stat.size}`;
  } catch {
    return "missing";
  }
}

function loadFile(): CityState {
  const stamp = fileStamp();
  if (cached && cached.stamp === stamp && cached.file === dataFile()) return cached.state;
  let state: CityState;
  try {
    state = normalize(JSON.parse(readFileSync(dataFile(), "utf8")) as Partial<CityState>);
  } catch {
    state = structuredClone(EMPTY);
  }
  cached = { state, stamp, file: dataFile() };
  return state;
}

let writeQueue: Promise<unknown> = Promise.resolve();

const fileBackend: CityBackend = {
  async read() {
    return loadFile();
  },
  mutate<T>(fn: Mutation<T>): Promise<T> {
    // The whole read-modify-write runs in the queue, so two summons in the
    // same instance can never both pass the "city full" check.
    const run = async () => {
      const state = structuredClone(loadFile());
      const { value, write } = fn(state);
      if (write) {
        mkdirSync(dataDir(), { recursive: true });
        const tmp = `${dataFile()}.tmp`;
        writeFileSync(tmp, JSON.stringify(state));
        renameSync(tmp, dataFile());
        cached = { state, stamp: fileStamp(), file: dataFile() };
      }
      return value;
    };
    const next = writeQueue.then(run, run);
    writeQueue = next.catch(() => undefined);
    return next;
  },
};

// --- supabase backend ------------------------------------------------------------

const CITY_ROW = "city";

function supabaseBackend(): CityBackend | null {
  const env = supabaseEnv();
  if (!env) return null;
  const docs = versionedDocs<CityState>(supabaseRest(env), "clone_city", "id");
  return {
    async read() {
      return normalize(await docs.get(CITY_ROW));
    },
    async mutate<T>(fn: Mutation<T>): Promise<T> {
      const wrapped = (doc: CityState) => {
        const state = normalize(doc);
        const result = fn(state);
        Object.assign(doc, state);
        return result;
      };
      try {
        return await docs.update(CITY_ROW, wrapped);
      } catch (error) {
        if ((error as Error).message !== "Unknown key") throw error;
        await docs.insert(CITY_ROW, structuredClone(EMPTY)); // first write ever
        return docs.update(CITY_ROW, wrapped);
      }
    },
  };
}

function backend(): CityBackend {
  return supabaseBackend() ?? fileBackend;
}

/** Which backend this process is using, for /api/status. */
export function storeKind(): "supabase" | "file" {
  return supabaseEnv() ? "supabase" : "file";
}

// --- reads -------------------------------------------------------------------

export async function summonedClones(): Promise<SummonedClone[]> {
  return (await backend().read()).summoned;
}

export async function cityFeed(): Promise<FeedEntry[]> {
  return (await backend().read()).feed;
}

// --- writes ------------------------------------------------------------------

export type SummonResult =
  | { ok: true; clone: SummonedClone; already: boolean }
  | { ok: false; reason: "full" };

export function summon(clone: Omit<SummonedClone, "summonedAt">): Promise<SummonResult> {
  return backend().mutate<SummonResult>((state) => {
    const existing = state.summoned.find((entry) => entry.mint === clone.mint);
    if (existing) return { value: { ok: true, clone: existing, already: true }, write: false };
    if (state.summoned.length >= MAX_SUMMONED) return { value: { ok: false, reason: "full" }, write: false };

    const record: SummonedClone = { ...clone, summonedAt: new Date().toISOString() };
    state.summoned.push(record);
    state.feed.push({ at: Date.now(), kind: "summon", mint: clone.mint, symbol: clone.symbol });
    state.feed = state.feed.slice(-MAX_FEED);
    return { value: { ok: true, clone: record, already: false }, write: true };
  });
}

export interface SpeechCandidate {
  mint: string;
  symbol: string;
  bucket: number;
  text: string;
  place: string;
  mind: "rules" | "claude";
  awake: boolean;
}

/**
 * Records this round's speech lines (one per clone per bucket) and any
 * wake/sleep transitions since the last round. Returns the updated feed.
 */
export function recordRound(candidates: SpeechCandidate[]): Promise<FeedEntry[]> {
  return backend().mutate((state) => {
    const now = Date.now();
    let changed = false;

    for (const candidate of candidates) {
      const previous = state.awake[candidate.mint];
      if (previous !== undefined && previous !== candidate.awake) {
        state.feed.push({
          at: now,
          kind: candidate.awake ? "wake" : "sleep",
          mint: candidate.mint,
          symbol: candidate.symbol,
        });
        changed = true;
      }
      if (previous !== candidate.awake) {
        state.awake[candidate.mint] = candidate.awake;
        changed = true;
      }

      if (candidate.awake && state.spoken[candidate.mint] !== candidate.bucket) {
        state.spoken[candidate.mint] = candidate.bucket;
        state.feed.push({
          at: now,
          kind: "speech",
          mint: candidate.mint,
          symbol: candidate.symbol,
          text: candidate.text,
          place: candidate.place,
          mind: candidate.mind,
        });
        changed = true;
      }
    }

    if (changed) state.feed = state.feed.slice(-MAX_FEED);
    return { value: state.feed, write: changed };
  });
}
