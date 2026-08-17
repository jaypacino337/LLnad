/**
 * Which brand image files were present at build time. Inlined by Next from
 * next.config.ts, so these are safe in both server and client components.
 *
 * To activate: commit the artwork as
 *   public/brand/agent.png   — the hooded agent mascot (square)
 *   public/brand/banner.png  — the wide banner (used as the social card)
 * and redeploy. Absent files fall back to the built-in geometric glyph.
 */
export const BRAND = {
  agent: process.env.NEXT_PUBLIC_BRAND_AGENT === "1",
  banner: process.env.NEXT_PUBLIC_BRAND_BANNER === "1",
} as const;

export const BRAND_AGENT_SRC = "/brand/agent.png";
export const BRAND_BANNER_SRC = "/brand/banner.png";
