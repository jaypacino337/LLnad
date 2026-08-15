import { promises as fs } from "node:fs";
import path from "node:path";

import { TOTAL_PLOTS, parseCoord } from "./land";
import { SEED_PLOTS, type SeedPlot } from "./seed";
import type { ClaimInput, LandStats, Plot } from "./types";

/**
 * Plots live in a single JSON document written atomically. That keeps the app
 * dependency-free and easy to host; everything the rest of the code touches
 * goes through the functions below, so moving to a real database later only
 * means reimplementing this module.
 */

const DATA_DIR = process.env.SOLANDA_DATA_DIR ?? path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "plots.json");

type PlotMap = Map<string, Plot>;

let cache: PlotMap | null = null;
let loading: Promise<PlotMap> | null = null;
/** Serialises writes so two concurrent claims cannot clobber each other. */
let writeQueue: Promise<unknown> = Promise.resolve();

function hydrate(seed: SeedPlot): Plot | null {
  const position = parseCoord(seed.coord);
  if (!position) return null;
  return { ...seed, coord: seed.coord.toUpperCase(), col: position.col, row: position.row };
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
    const records = Array.isArray(parsed)
      ? parsed
      : ((parsed as { plots?: unknown }).plots ?? []);
    if (!Array.isArray(records)) throw new Error("plots.json is not a list of plots");

    const map: PlotMap = new Map();
    for (const record of records) {
      if (!isPlotShaped(record)) continue;
      const plot = hydrate(record);
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
    }));

  const body = `${JSON.stringify({ version: 1, plots: snapshot }, null, 2)}\n`;
  const temp = `${DATA_FILE}.${process.pid}.tmp`;

  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(temp, body, "utf8");
  await fs.rename(temp, DATA_FILE);
}

function enqueueWrite(map: PlotMap): Promise<void> {
  const next = writeQueue.then(() => persist(map));
  // Keep the chain alive even if one write fails.
  writeQueue = next.catch(() => {});
  return next;
}

async function load(): Promise<PlotMap> {
  if (cache) return cache;
  if (!loading) {
    loading = (async () => {
      const fromDisk = await readFromDisk();
      if (fromDisk) {
        cache = fromDisk;
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
  return [...map.values()].sort((a, b) => b.claimedAt.localeCompare(a.claimedAt));
}

export async function getPlot(coord: string): Promise<Plot | null> {
  const map = await load();
  return map.get(coord.trim().toUpperCase()) ?? null;
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
  | { ok: true; plot: Plot }
  | { ok: false; reason: "taken"; plot: Plot }
  | { ok: false; reason: "out-of-bounds" };

export async function claimPlot(input: ClaimInput, claimedAt = new Date()): Promise<ClaimResult> {
  const map = await load();
  const coord = input.coord.trim().toUpperCase();
  const position = parseCoord(coord);
  if (!position) return { ok: false, reason: "out-of-bounds" };

  const existing = map.get(coord);
  if (existing) return { ok: false, reason: "taken", plot: existing };

  const plot: Plot = {
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
  };

  map.set(coord, plot);
  try {
    await enqueueWrite(map);
  } catch (error) {
    map.delete(coord);
    throw error;
  }

  return { ok: true, plot };
}
