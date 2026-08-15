import { promises as fs } from "node:fs";
import path from "node:path";

import { claimKeyMatches, generateClaimKey, hashClaimKey } from "./keys";
import { TOTAL_PLOTS, parseCoord } from "./land";
import { SEED_PLOTS, type SeedPlot } from "./seed";
import type { ClaimInput, LandStats, Plot, PlotPatch, StoredPlot } from "./types";

/**
 * Plots live in a single JSON document written atomically. That keeps the app
 * dependency-free and easy to host; everything the rest of the code touches
 * goes through the functions below, so moving to a real database later only
 * means reimplementing this module.
 *
 * Readers return the public `Plot` shape. The owner's key hash never leaves
 * this file except through the auth helpers, which compare rather than return.
 */

const DATA_DIR = process.env.SOLANDA_DATA_DIR ?? path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "plots.json");

type PlotMap = Map<string, StoredPlot>;

let cache: PlotMap | null = null;
/**
 * Identifies the exact file revision `cache` was built from.
 *
 * The cache cannot be assumed private: Next bundles route handlers and page
 * renderers separately, so a single server already holds more than one copy of
 * this module, and a multi-process deployment holds more still. Whoever writes
 * updates only their own copy, so every read re-checks the file and reloads if
 * somebody else has moved it on. A stat is far cheaper than a parse, so the
 * cache still does its job.
 */
let cacheStamp: string | null = null;
let loading: Promise<PlotMap> | null = null;
/** Serialises writes so two concurrent claims cannot clobber each other. */
let writeQueue: Promise<unknown> = Promise.resolve();

/** Size as well as mtime, so a same-millisecond rewrite is still noticed. */
async function fileStamp(): Promise<string | null> {
  try {
    const info = await fs.stat(DATA_FILE);
    return `${info.mtimeMs}:${info.size}`;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

/** Strip the secret. Every exported reader funnels through this. */
function toPublic(plot: StoredPlot): Plot {
  return {
    coord: plot.coord,
    col: plot.col,
    row: plot.row,
    title: plot.title,
    handle: plot.handle,
    url: plot.url,
    bio: plot.bio,
    color: plot.color,
    glyph: plot.glyph,
    claimedAt: plot.claimedAt,
    updatedAt: plot.updatedAt,
  };
}

function hydrate(record: SeedPlot & { keyHash?: string | null }): StoredPlot | null {
  const position = parseCoord(record.coord);
  if (!position) return null;
  return {
    ...record,
    coord: record.coord.toUpperCase(),
    col: position.col,
    row: position.row,
    updatedAt: record.updatedAt ?? null,
    keyHash: record.keyHash ?? null,
  };
}

function seedMap(): PlotMap {
  const map: PlotMap = new Map();
  for (const seed of SEED_PLOTS) {
    const plot = hydrate(seed);
    if (plot) map.set(plot.coord, plot);
  }
  return map;
}

function isPlotShaped(value: unknown): value is SeedPlot {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.coord === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.handle === "string" &&
    typeof candidate.color === "string" &&
    typeof candidate.glyph === "string" &&
    typeof candidate.claimedAt === "string"
  );
}

async function readFromDisk(): Promise<PlotMap | null> {
  let raw: string;
  try {
    raw = await fs.readFile(DATA_FILE, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    const records = Array.isArray(parsed) ? parsed : ((parsed as { plots?: unknown }).plots ?? []);
    if (!Array.isArray(records)) throw new Error("plots.json is not a list of plots");

    const map: PlotMap = new Map();
    for (const record of records) {
      if (!isPlotShaped(record)) continue;
      const plot = hydrate(record as SeedPlot & { keyHash?: string | null });
      if (plot) map.set(plot.coord, plot);
    }
    return map;
  } catch (error) {
    // Never lose a settler to a bad parse: park the file and start from seed.
    const quarantine = `${DATA_FILE}.corrupt-${process.pid}`;
    await fs.rename(DATA_FILE, quarantine).catch(() => {});
    console.error(`[solanda] could not read ${DATA_FILE}, moved to ${quarantine}`, error);
    return null;
  }
}

async function persist(map: PlotMap): Promise<void> {
  // col/row are derived from `coord`, so they are left out of the file.
  const snapshot = [...map.values()]
    .sort((a, b) => a.claimedAt.localeCompare(b.claimedAt))
    .map((plot) => ({
      coord: plot.coord,
      title: plot.title,
      handle: plot.handle,
      url: plot.url,
      bio: plot.bio,
      color: plot.color,
      glyph: plot.glyph,
      claimedAt: plot.claimedAt,
      updatedAt: plot.updatedAt,
      keyHash: plot.keyHash,
    }));

  const body = `${JSON.stringify({ version: 2, plots: snapshot }, null, 2)}\n`;
  const temp = `${DATA_FILE}.${process.pid}.tmp`;

  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(temp, body, "utf8");
  await fs.rename(temp, DATA_FILE);

  // We already hold this revision in memory, so record it rather than forcing
  // the next read to parse the file we just wrote.
  cacheStamp = await fileStamp();
}

function enqueueWrite(map: PlotMap): Promise<void> {
  const next = writeQueue.then(() => persist(map));
  // Keep the chain alive even if one write fails.
  writeQueue = next.catch(() => {});
  return next;
}

async function load(): Promise<PlotMap> {
  // Cheap freshness check first: if the file is exactly as we last saw it,
  // the copy in memory is still authoritative.
  const stamp = await fileStamp();
  if (cache && cacheStamp !== null && stamp === cacheStamp) return cache;

  if (!loading) {
    loading = (async () => {
      const fromDisk = await readFromDisk();
      if (fromDisk) {
        cache = fromDisk;
        cacheStamp = await fileStamp();
      } else {
        cache = seedMap();
        await enqueueWrite(cache).catch((error) => {
          console.error("[solanda] could not write the initial land record", error);
        });
      }
      return cache;
    })().finally(() => {
      loading = null;
    });
  }
  return loading;
}

/** Newest claims first. */
export async function listPlots(): Promise<Plot[]> {
  const map = await load();
  return [...map.values()]
    .sort((a, b) => b.claimedAt.localeCompare(a.claimedAt))
    .map(toPublic);
}

export async function getPlot(coord: string): Promise<Plot | null> {
  const map = await load();
  const plot = map.get(coord.trim().toUpperCase());
  return plot ? toPublic(plot) : null;
}

export async function recentPlots(limit = 6): Promise<Plot[]> {
  return (await listPlots()).slice(0, limit);
}

export async function getStats(): Promise<LandStats> {
  const plots = await listPlots();
  return {
    total: TOTAL_PLOTS,
    claimed: plots.length,
    available: TOTAL_PLOTS - plots.length,
    settlers: new Set(plots.map((plot) => plot.handle)).size,
    latestClaimAt: plots[0]?.claimedAt ?? null,
  };
}

export type ClaimResult =
  | { ok: true; plot: Plot; claimKey: string }
  | { ok: false; reason: "taken"; plot: Plot }
  | { ok: false; reason: "out-of-bounds" };

export async function claimPlot(input: ClaimInput, claimedAt = new Date()): Promise<ClaimResult> {
  const map = await load();
  const coord = input.coord.trim().toUpperCase();
  const position = parseCoord(coord);
  if (!position) return { ok: false, reason: "out-of-bounds" };

  const existing = map.get(coord);
  if (existing) return { ok: false, reason: "taken", plot: toPublic(existing) };

  const claimKey = generateClaimKey();
  const plot: StoredPlot = {
    coord,
    col: position.col,
    row: position.row,
    title: input.title,
    handle: input.handle,
    url: input.url ?? null,
    bio: input.bio ?? null,
    color: input.color,
    glyph: input.glyph,
    claimedAt: claimedAt.toISOString(),
    updatedAt: null,
    keyHash: hashClaimKey(claimKey),
  };

  map.set(coord, plot);
  try {
    await enqueueWrite(map);
  } catch (error) {
    map.delete(coord);
    throw error;
  }

  // The only time the plaintext key exists outside the claimant's browser.
  return { ok: true, plot: toPublic(plot), claimKey };
}

export type OwnerResult<T> =
  | { ok: true; value: T }
  /** No such plot, or it is unclaimed. */
  | { ok: false; reason: "not-found" }
  /** Wrong key. */
  | { ok: false; reason: "forbidden" }
  /** A founding plot: real, but nobody holds a key to it. */
  | { ok: false; reason: "immutable" };

/** Resolve a plot only if the supplied key opens it. */
async function authorise(coord: string, key: string): Promise<OwnerResult<StoredPlot>> {
  const map = await load();
  const plot = map.get(coord.trim().toUpperCase());
  if (!plot) return { ok: false, reason: "not-found" };
  if (!plot.keyHash) return { ok: false, reason: "immutable" };
  if (!claimKeyMatches(key, plot.keyHash)) return { ok: false, reason: "forbidden" };
  return { ok: true, value: plot };
}

export async function updatePlot(
  coord: string,
  key: string,
  patch: PlotPatch,
  updatedAt = new Date(),
): Promise<OwnerResult<Plot>> {
  const auth = await authorise(coord, key);
  if (!auth.ok) return auth;

  const map = await load();
  const current = auth.value;
  const next: StoredPlot = {
    ...current,
    title: patch.title ?? current.title,
    url: patch.url === undefined ? current.url : patch.url,
    bio: patch.bio === undefined ? current.bio : patch.bio,
    color: patch.color ?? current.color,
    glyph: patch.glyph ?? current.glyph,
    updatedAt: updatedAt.toISOString(),
  };

  map.set(next.coord, next);
  try {
    await enqueueWrite(map);
  } catch (error) {
    map.set(current.coord, current);
    throw error;
  }

  return { ok: true, value: toPublic(next) };
}

/** Hand a plot back. The address returns to the pool, free for anyone. */
export async function releasePlot(coord: string, key: string): Promise<OwnerResult<Plot>> {
  const auth = await authorise(coord, key);
  if (!auth.ok) return auth;

  const map = await load();
  const removed = auth.value;
  map.delete(removed.coord);
  try {
    await enqueueWrite(map);
  } catch (error) {
    map.set(removed.coord, removed);
    throw error;
  }

  return { ok: true, value: toPublic(removed) };
}

/** Test seam: drop the in-process cache so the next read hits disk again. */
export function resetCacheForTests(): void {
  cache = null;
  cacheStamp = null;
  loading = null;
}
