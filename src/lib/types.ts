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

export interface LandStats {
  total: number;
  claimed: number;
  available: number;
  settlers: number;
  latestClaimAt: string | null;
}

export type FieldErrors = Partial<Record<keyof ClaimInput, string>>;
