/**
 * A small in-process sliding-window limiter. Good enough to stop one client
 * carpeting the map; swap for a shared store if this ever runs multi-instance.
 */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_CLAIMS = 5;
const MAX_TRACKED_KEYS = 5_000;

const hits = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkClaimRate(key: string, now: number = Date.now()): RateLimitResult {
  if (hits.size > MAX_TRACKED_KEYS) hits.clear();

  const cutoff = now - WINDOW_MS;
  const recent = (hits.get(key) ?? []).filter((at) => at > cutoff);

  if (recent.length >= MAX_CLAIMS) {
    const retryAfterSeconds = Math.max(1, Math.ceil((recent[0] + WINDOW_MS - now) / 1000));
    hits.set(key, recent);
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  recent.push(now);
  hits.set(key, recent);
  return { allowed: true, remaining: MAX_CLAIMS - recent.length, retryAfterSeconds: 0 };
}

/** Best-effort client identity from proxy headers. */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}
