/**
 * The city and its clones, as pure functions.
 *
 * Everything here is deterministic: a clone's look, personality and walking
 * schedule derive only from its mint address and the clock. The server and
 * every browser compute identical worlds without ever exchanging coordinates,
 * which is what lets the city animate at 60fps off a 30-second data poll.
 *
 * What is NOT decided here: whether a clone is awake and how much energy it
 * has. Those come from live market data — a clone is awake because its token
 * really traded in the last hour, never because a script said so.
 */

export interface Place {
  id: string;
  label: string;
  /** [x1, y1, x2, y2] inclusive cell bounds on the grid. */
  rect: [number, number, number, number];
  /** Street-side cell where paths enter and leave. */
  door: [number, number];
  /** Roofless plaza: sprites may be drawn anywhere inside. */
  open: boolean;
}

export const GRID_W = 64;
export const GRID_H = 36;

/** The corridor row every walk routes through — clear of building walls. */
const STREET_Y = 12;

export const PLACES: Place[] = [
  { id: "lab", label: "CLONE LAB", rect: [3, 2, 13, 9], door: [8, 10], open: false },
  { id: "bbs", label: "BBS", rect: [18, 2, 27, 8], door: [22, 9], open: false },
  { id: "guestbook", label: "GUESTBOOK", rect: [32, 2, 41, 8], door: [36, 9], open: false },
  { id: "mall", label: "THE MALL", rect: [46, 2, 57, 9], door: [51, 10], open: false },
  { id: "index", label: "THE INDEX", rect: [24, 14, 40, 22], door: [32, 23], open: true },
  { id: "cache", label: "THE CACHE", rect: [3, 26, 14, 33], door: [8, 25], open: false },
  { id: "arcade", label: "ARCADE", rect: [19, 27, 28, 33], door: [23, 26], open: false },
  { id: "void", label: "404", rect: [34, 27, 44, 33], door: [39, 26], open: true },
  { id: "ring", label: "WEBRING", rect: [49, 26, 60, 33], door: [54, 25], open: false },
];

const PLACE_BY_ID = new Map(PLACES.map((place) => [place.id, place]));

export function placeById(id: string): Place {
  const place = PLACE_BY_ID.get(id);
  if (!place) throw new Error(`unknown place: ${id}`);
  return place;
}

/** Where sprites sleep. Dormant clones never leave it. */
export const SLEEP_PLACE = "cache";

// --- deterministic randomness ----------------------------------------------

/** FNV-1a, folded with numeric salts. Stable across platforms. */
export function hash32(text: string, ...salts: number[]): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  for (const salt of salts) {
    h ^= salt | 0;
    h = Math.imul(h, 0x01000193);
    h ^= h >>> 15;
  }
  // Final avalanche so consecutive salts do not produce correlated values.
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return h >>> 0;
}

/** Uniform [0, 1) from a string seed plus salts. Stateless on purpose. */
export function unit(text: string, ...salts: number[]): number {
  return hash32(text, ...salts) / 0x100000000;
}

export function pick<T>(list: readonly T[], text: string, ...salts: number[]): T {
  return list[hash32(text, ...salts) % list.length];
}

// --- personality ------------------------------------------------------------

export type Archetype =
  | "optimist"
  | "doomer"
  | "gremlin"
  | "poet"
  | "hustler"
  | "lurker"
  | "oracle"
  | "janitor";

export const ARCHETYPES: Archetype[] = [
  "optimist",
  "doomer",
  "gremlin",
  "poet",
  "hustler",
  "lurker",
  "oracle",
  "janitor",
];

export const ARCHETYPE_BIO: Record<Archetype, string> = {
  optimist: "Believes every candle is a sunrise. Waves at strangers.",
  doomer: "Has read the chart. Has read all the charts. It's over, probably.",
  gremlin: "Feeds on volume. Do not feed after midnight anyway.",
  poet: "Writes verses about liquidity in the guestbook.",
  hustler: "Always mid-pitch. The pitch is itself.",
  lurker: "Reads everything, says little, remembers all of it.",
  oracle: "Speaks in percentages. Occasionally right.",
  janitor: "Keeps the city tidy and the order book tidier.",
};

export interface Persona {
  archetype: Archetype;
  /** Hex color derived from the mint; used for the sprite and accents. */
  color: string;
  /** The place this clone drifts back to when nothing is happening. */
  favorite: string;
  bio: string;
}

const FAVORITE_CANDIDATES = ["index", "bbs", "guestbook", "mall", "arcade", "void", "ring", "lab"];

/** HSL→hex with fixed saturation/lightness so every color reads on paper. */
function seededColor(mint: string): string {
  const hue = hash32(mint, 7) % 360;
  const s = 0.62;
  const l = 0.4;
  const a = s * Math.min(l, 1 - l);
  const channel = (n: number) => {
    const k = (n + hue / 30) % 12;
    const value = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * value)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

export function personaFor(mint: string): Persona {
  const archetype = pick(ARCHETYPES, mint, 1);
  return {
    archetype,
    color: seededColor(mint),
    favorite: pick(FAVORITE_CANDIDATES, mint, 2),
    bio: ARCHETYPE_BIO[archetype],
  };
}

// --- sprite ------------------------------------------------------------------

export const SPRITE_W = 10;
export const SPRITE_H = 8;

/**
 * A mirrored pixel creature: the left half is seeded bits, the right half its
 * reflection, with two fixed eye holes so everything reads as a face.
 */
export function spriteCells(mint: string): boolean[][] {
  const half = SPRITE_W / 2;
  const rows: boolean[][] = [];
  for (let y = 0; y < SPRITE_H; y++) {
    const row: boolean[] = new Array(SPRITE_W).fill(false);
    for (let x = 0; x < half; x++) {
      // Denser in the middle rows so bodies look solid, wispier at the edges.
      const density = y === 0 || y === SPRITE_H - 1 ? 0.3 : 0.58;
      const on = unit(mint, 100 + y * half + x) < density;
      row[x] = on;
      row[SPRITE_W - 1 - x] = on;
    }
    rows.push(row);
  }
  // Eyes: always present, always off-cells so they punch through any body.
  rows[2][3] = true;
  rows[2][6] = true;
  rows[3][3] = false;
  rows[3][6] = false;
  return rows;
}

// --- vitality (driven by live data, computed here, labeled in the UI) --------

export interface LiveStats {
  priceUsd: number | null;
  marketCap: number | null;
  liquidityUsd: number | null;
  volume1h: number | null;
  volume24h: number | null;
  change1h: number | null;
  change24h: number | null;
  buys1h: number | null;
  sells1h: number | null;
}

/** Awake means the token really traded in the last hour. Nothing else. */
export function isAwake(stats: LiveStats): boolean {
  return (stats.volume1h ?? 0) > 0 || (stats.buys1h ?? 0) + (stats.sells1h ?? 0) > 0;
}

/**
 * Energy is the 24h volume on a log scale: $0 → 0, $1k → ~0.5, $1M+ → 1.
 * It is a reading of real volume, not a simulated resource.
 */
export function energyFrom(volume24h: number | null): number {
  const volume = Math.max(0, volume24h ?? 0);
  return Math.min(1, Math.log10(volume + 1) / 6);
}

export type Mood = "euphoric" | "up" | "flat" | "down" | "wrecked";

export function moodFrom(change1h: number | null): Mood {
  if (change1h === null || !Number.isFinite(change1h)) return "flat";
  if (change1h >= 8) return "euphoric";
  if (change1h >= 1) return "up";
  if (change1h > -1) return "flat";
  if (change1h > -8) return "down";
  return "wrecked";
}

// --- movement ----------------------------------------------------------------

/** How long a clone hangs out somewhere before wandering on. */
export const SLOT_MS = 150_000;
/** Grid cells per second while walking. */
const SPEED = 2.6;

interface Point {
  x: number;
  y: number;
}

/** A seeded standing spot inside a place, biased off the walls. */
function hangoutPoint(place: Place, mint: string, slot: number): Point {
  const [x1, y1, x2, y2] = place.rect;
  const padX = Math.min(1.5, (x2 - x1) / 4);
  const padY = Math.min(1.5, (y2 - y1) / 4);
  return {
    x: x1 + padX + unit(mint, slot * 2 + 11) * (x2 - x1 - padX * 2),
    y: y1 + padY + unit(mint, slot * 2 + 12) * (y2 - y1 - padY * 2),
  };
}

/** Which place a clone is in (or heading to) during a slot. */
export function placeForSlot(mint: string, slot: number, awake: boolean): string {
  if (!awake) return SLEEP_PLACE;
  const persona = personaFor(mint);
  // Favorite place three tickets, the plaza two, everywhere else one.
  const tickets: string[] = [];
  for (const place of PLACES) {
    const count = place.id === persona.favorite ? 3 : place.id === "index" ? 2 : 1;
    for (let i = 0; i < count; i++) tickets.push(place.id);
  }
  return pick(tickets, mint, slot + 31);
}

/**
 * The canonical walk: out the door, along the mid-city street, in the next
 * door. The street row and door columns never intersect a closed building,
 * so sprites don't phase through walls (crossing the open plaza is allowed).
 */
function waypoints(from: Point, fromPlace: Place, to: Point, toPlace: Place): Point[] {
  if (fromPlace.id === toPlace.id) return [from, to];
  const [ax, ay] = fromPlace.door;
  const [bx, by] = toPlace.door;
  return [
    from,
    { x: ax, y: ay },
    { x: ax, y: STREET_Y },
    { x: bx, y: STREET_Y },
    { x: bx, y: by },
    to,
  ];
}

function pathLength(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.abs(points[i].x - points[i - 1].x) + Math.abs(points[i].y - points[i - 1].y);
  }
  return total;
}

/** Walks `distance` cells along a Manhattan polyline (x-leg then y-leg). */
function walkAlong(points: Point[], distance: number): { point: Point; dx: number; dy: number } {
  let remaining = distance;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const next = points[i];
    const legX = next.x - prev.x;
    const legY = next.y - prev.y;
    const lenX = Math.abs(legX);
    const lenY = Math.abs(legY);
    if (remaining <= lenX) {
      return { point: { x: prev.x + Math.sign(legX) * remaining, y: prev.y }, dx: Math.sign(legX), dy: 0 };
    }
    remaining -= lenX;
    if (remaining <= lenY) {
      return { point: { x: next.x, y: prev.y + Math.sign(legY) * remaining }, dx: 0, dy: Math.sign(legY) };
    }
    remaining -= lenY;
  }
  const last = points[points.length - 1];
  return { point: last, dx: 0, dy: 0 };
}

export interface Pose {
  x: number;
  y: number;
  /** The place occupied or walked toward this slot. */
  place: string;
  walking: boolean;
  /** Unit direction while walking; 0,0 while idling. */
  dx: number;
  dy: number;
}

/**
 * Where a clone stands at `timeMs`. Pure: every caller with the same inputs
 * sees the same pose, which keeps server HTML and client animation in sync.
 */
export function poseAt(mint: string, timeMs: number, awake: boolean): Pose {
  const slot = Math.floor(timeMs / SLOT_MS);
  const inSlot = timeMs - slot * SLOT_MS;

  const prevPlace = placeById(placeForSlot(mint, slot - 1, awake));
  const currPlace = placeById(placeForSlot(mint, slot, awake));
  const start = hangoutPoint(prevPlace, mint, slot - 1);
  const end = hangoutPoint(currPlace, mint, slot);

  const route = waypoints(start, prevPlace, end, currPlace);
  const total = pathLength(route);
  const walkMs = (total / SPEED) * 1000;

  if (inSlot < walkMs && total > 0) {
    const { point, dx, dy } = walkAlong(route, (inSlot / walkMs) * total);
    return { x: point.x, y: point.y, place: currPlace.id, walking: true, dx, dy };
  }

  // Idling: a slow seeded sway around the hangout spot, clamped to the room.
  const t = (timeMs - slot * SLOT_MS - walkMs) / 1000;
  const phase = unit(mint, slot + 77) * Math.PI * 2;
  const [x1, y1, x2, y2] = currPlace.rect;
  const x = Math.min(x2 - 0.5, Math.max(x1 + 0.5, end.x + Math.sin(t / 6 + phase) * 0.9));
  const y = Math.min(y2 - 0.5, Math.max(y1 + 0.5, end.y + Math.cos(t / 8 + phase) * 0.6));
  return { x, y, place: currPlace.id, walking: false, dx: 0, dy: 0 };
}
