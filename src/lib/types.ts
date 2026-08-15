/** A plot as anyone may see it. Never carries the owner's secret. */
export interface Plot {
  /** Canonical address, e.g. "AC17". */
  coord: string;
  col: number;
  row: number;
  /** What the settler calls their plot. */
  title: string;
  /** Settler handle, without an @. */
  handle: string;
  url: string | null;
  bio: string | null;
  /** Key into PLOT_COLORS. */
  color: string;
  /** One of GLYPHS. */
  glyph: string;
  claimedAt: string;
  updatedAt: string | null;
}

/**
 * The on-disk shape. `keyHash` is the SHA-256 of the owner's claim key, and is
 * null for the founding settlement, which nobody holds the key to. This type
 * must never reach an API response — go through the store's public readers.
 */
export interface StoredPlot extends Plot {
  keyHash: string | null;
}

export interface ClaimInput {
  coord: string;
  title: string;
  handle: string;
  url?: string | null;
  bio?: string | null;
  color: string;
  glyph: string;
}

/** The fields an owner may change. The address and handle are fixed for good. */
export interface PlotPatch {
  title?: string;
  url?: string | null;
  bio?: string | null;
  color?: string;
  glyph?: string;
}

export interface LandStats {
  total: number;
  claimed: number;
  available: number;
  settlers: number;
  latestClaimAt: string | null;
}

export type FieldErrors = Partial<Record<keyof ClaimInput, string>>;
