/**
 * X (Twitter) autoposting.
 *
 * Behaviour is deliberately conservative:
 *  - nothing is posted unless all four credentials are present;
 *  - without credentials the route still runs and returns the composed text as
 *    a dry run, so a schedule can be verified before going live;
 *  - a signal is only ever posted once (in-process seen-set);
 *  - posts are composed from the same deterministic rules the UI shows, so the
 *    account never states something the site cannot substantiate.
 */

import type { Signal } from "./signals";

export const X_ENV = [
  "X_API_KEY",
  "X_API_SECRET",
  "X_ACCESS_TOKEN",
  "X_ACCESS_TOKEN_SECRET",
] as const;

export interface AutopostResult {
  configured: boolean;
  posted: boolean;
  /** "dry-run" when credentials are absent, "skipped" when nothing qualifies. */
  outcome: "posted" | "dry-run" | "skipped" | "error";
  text: string | null;
  signalId: string | null;
  detail: string;
  missingEnv: string[];
}

/** Only post a signal the rules consider strong. */
const MIN_STRENGTH = 0.6;

/** Signal ids already posted this process lifetime. */
const posted = new Set<string>();

export function isAutopostConfigured(): boolean {
  return X_ENV.every((key) => Boolean(process.env[key]));
}

export function missingAutopostEnv(): string[] {
  return X_ENV.filter((key) => !process.env[key]);
}

/** Composes a post from a rule result. Numbers come from the signal itself. */
export function composePost(signal: Signal): string {
  const inputs = signal.inputs.map((input) => `${input.label} ${input.value}`).join(" · ");
  return [`$${signal.symbol} — ${signal.label}`, signal.observation, inputs, signal.url].join("\n");
}

/** Picks the strongest not-yet-posted signal. */
export function selectForPost(signals: Signal[]): Signal | null {
  return signals.find((signal) => signal.strength >= MIN_STRENGTH && !posted.has(signal.id)) ?? null;
}

export function markPosted(signalId: string): void {
  posted.add(signalId);
  // Bound the set so a long-lived process cannot grow without limit.
  if (posted.size > 500) {
    const oldest = posted.values().next().value;
    if (oldest) posted.delete(oldest);
  }
}

/**
 * Posts to X using OAuth 1.0a. Kept in one place so the credential handling and
 * the failure path are easy to audit.
 */
async function postToX(text: string): Promise<void> {
  const { createHmac, randomBytes } = await import("node:crypto");

  const url = "https://api.twitter.com/2/tweets";
  const oauth: Record<string, string> = {
    oauth_consumer_key: process.env.X_API_KEY!,
    oauth_nonce: randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: process.env.X_ACCESS_TOKEN!,
    oauth_version: "1.0",
  };

  const encode = (value: string) =>
    encodeURIComponent(value).replace(
      /[!'()*]/g,
      (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
    );

  const paramString = Object.keys(oauth)
    .sort()
    .map((key) => `${encode(key)}=${encode(oauth[key])}`)
    .join("&");

  const baseString = ["POST", encode(url), encode(paramString)].join("&");
  const signingKey = `${encode(process.env.X_API_SECRET!)}&${encode(
    process.env.X_ACCESS_TOKEN_SECRET!,
  )}`;
  oauth.oauth_signature = createHmac("sha1", signingKey).update(baseString).digest("base64");

  const header = `OAuth ${Object.keys(oauth)
    .sort()
    .map((key) => `${encode(key)}="${encode(oauth[key])}"`)
    .join(", ")}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { authorization: header, "content-type": "application/json" },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`X API responded ${response.status}: ${await response.text()}`);
  }
}

export async function runAutopost(signals: Signal[]): Promise<AutopostResult> {
  const missingEnv = missingAutopostEnv();
  const configured = missingEnv.length === 0;
  const signal = selectForPost(signals);

  if (!signal) {
    return {
      configured,
      posted: false,
      outcome: "skipped",
      text: null,
      signalId: null,
      detail: `No unposted signal at or above strength ${MIN_STRENGTH}.`,
      missingEnv,
    };
  }

  const text = composePost(signal);

  if (!configured) {
    return {
      configured: false,
      posted: false,
      outcome: "dry-run",
      text,
      signalId: signal.id,
      detail: `Credentials absent, nothing sent. Set ${missingEnv.join(", ")} to post.`,
      missingEnv,
    };
  }

  try {
    await postToX(text);
    markPosted(signal.id);
    return {
      configured: true,
      posted: true,
      outcome: "posted",
      text,
      signalId: signal.id,
      detail: "Posted to X.",
      missingEnv,
    };
  } catch (error) {
    return {
      configured: true,
      posted: false,
      outcome: "error",
      text,
      signalId: signal.id,
      detail: error instanceof Error ? error.message : "unknown error posting to X",
      missingEnv,
    };
  }
}
