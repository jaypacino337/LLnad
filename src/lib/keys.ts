import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * A plot is claimed anonymously — there are no accounts — so the claim key is
 * the only proof of ownership. It is shown to the settler exactly once and
 * stored only as a SHA-256 digest, so a leaked register cannot be used to take
 * over anyone's plot.
 */

/** 22 URL-safe characters. */
export function generateClaimKey(): string {
  return randomBytes(16).toString("base64url");
}

export function hashClaimKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("hex");
}

/** Constant-time comparison, so a wrong key cannot be narrowed down by timing. */
export function claimKeyMatches(key: string, hash: string | null): boolean {
  if (!hash || !key) return false;
  const candidate = Buffer.from(hashClaimKey(key), "hex");
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}
