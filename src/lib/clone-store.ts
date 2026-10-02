/**
 * Durable city state: which tokens were summoned, and the Overheard feed.
 *
 * Storage is a JSON file with atomic writes (tmp + rename) behind a serialized
 * queue. Next bundles route handlers and page renderers as separate module
 * instances, so every read re-checks the file stamp (mtime + size) and reloads
 * when another instance wrote — without this, pages can serve stale state.
 *
 * On serverless hosts the filesystem is ephemeral: summons and feed history
 * reset on cold starts. Wild clones (live trending tokens) repopulate the city
 * regardless; point CLONE_DATA_DIR at a mounted disk — or swap this module for
 * a database — to make summons permanent.
 */

import { mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

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

function dataDir(): string {
  return process.env.CLONE_DATA_DIR ?? path.join(process.cwd(), ".data");
}

function dataFile(): string {
  return path.join(dataDir(), "city.json");
}

let cached: { state: CityState; stamp: string } | null = null;

function fileStamp(): string {
  try {
    const stat = statSync(dataFile());
    return `${stat.mtimeMs}:${stat.size}`;
  } catch {
    return "missing";
  }
}

function load(): CityState {
  const stamp = fileStamp();
  if (cached && cached.stamp === stamp) return cached.state;
  let state: CityState;
  try {
    const raw = JSON.parse(readFileSync(dataFile(), "utf8")) as Partial<CityState>;
    state = {
      summoned: Array.isArray(raw.summoned) ? raw.summoned : [],
      feed: Array.isArray(raw.feed) ? raw.feed : [],
      spoken: raw.spoken && typeof raw.spoken === "object" ? raw.spoken : {},
      awake: raw.awake && typeof raw.awake === "object" ? raw.awake : {},
    };
  } catch {
    state = structuredClone(EMPTY);
  }
  cached = { state, stamp };
  return state;
}

let writeQueue: Promise<unknown> = Promise.resolve();

function persist(state: CityState): Promise<void> {
  const run = async () => {
    mkdirSync(dataDir(), { recursive: true });
    const tmp = `${dataFile()}.tmp`;
    writeFileSync(tmp, JSON.stringify(state));
    renameSync(tmp, dataFile());
    cached = { state, stamp: fileStamp() };
  };
  const next = writeQueue.then(run, run);
  writeQueue = next;
  return next;
}

// --- reads -------------------------------------------------------------------

export function summonedClones(): SummonedClone[] {
  return load().summoned;
}

export function cityFeed(): FeedEntry[] {
  return load().feed;
}

// --- writes ------------------------------------------------------------------

export type SummonResult =
  | { ok: true; clone: SummonedClone; already: boolean }
  | { ok: false; reason: "full" };

export async function summon(clone: Omit<SummonedClone, "summonedAt">): Promise<SummonResult> {
  const state = structuredClone(load());
  const existing = state.summoned.find((entry) => entry.mint === clone.mint);
  if (existing) return { ok: true, clone: existing, already: true };
  if (state.summoned.length >= MAX_SUMMONED) return { ok: false, reason: "full" };

  const record: SummonedClone = { ...clone, summonedAt: new Date().toISOString() };
  state.summoned.push(record);
  state.feed.push({ at: Date.now(), kind: "summon", mint: clone.mint, symbol: clone.symbol });
  state.feed = state.feed.slice(-MAX_FEED);
  await persist(state);
  return { ok: true, clone: record, already: false };
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
export async function recordRound(candidates: SpeechCandidate[]): Promise<FeedEntry[]> {
  const state = structuredClone(load());
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

  if (changed) {
    state.feed = state.feed.slice(-MAX_FEED);
    await persist(state);
  }
  return state.feed;
}
