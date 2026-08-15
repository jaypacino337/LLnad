/**
 * A small in-process sliding-window limiter. Good enough to stop one client
 * carpeting the map; swap for a shared store if this ever runs multi-instance.
 */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_TRACKED_KEYS = 5_000;

/** Claiming new ground is the expensive action, so it is the tightest bucket. */
const CLAIM_MAX = 5;
/** Editing something you already hold is cheap, and fiddling is expected. */
const EDIT_MAX = 30;

const hits = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRate(
  bucket: string,
  key: string,
  max: number,
  windowMs: number = WINDOW_MS,
  now: number = Date.now(),
): RateLimitResult {
  if (hits.size > MAX_TRACKED_KEYS) hits.clear();

  const id = `${bucket}:${key}`;
  const cutoff = now - windowMs;
  const recent = (hits.get(id) ?? []).filter((at) => at > cutoff);

  if (recent.length >= max) {
    const retryAfterSeconds = Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000));
    hits.set(id, recent);
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  recent.push(now);
  hits.set(id, recent);
  return { allowed: true, remaining: max - recent.length, retryAfterSeconds: 0 };
}

export function checkClaimRate(key: string, now?: number): RateLimitResult {
  return checkRate("claim", key, CLAIM_MAX, WINDOW_MS, now);
}

export function checkEditRate(key: string, now?: number): RateLimitResult {
  return checkRate("edit", key, EDIT_MAX, WINDOW_MS, now);
}

/** Best-effort client identity from proxy headers. */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}

/** Test seam: forget every tracked client. */
export function resetRateLimitsForTests(): void {
  hits.clear();
}
