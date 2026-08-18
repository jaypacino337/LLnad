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

import { createHmac } from "node:crypto";

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

/* --- OAuth 1.0a --------------------------------------------------------------
   Pure functions, exported so the signing can be verified against the test
   vector in X's own "Creating a signature" documentation. */

export interface OAuthCredentials {
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

/** RFC 3986 percent-encoding, stricter than encodeURIComponent. */
function percentEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/**
 * HMAC-SHA1 signature over method, url and the full parameter set (oauth
 * params plus, for form-encoded requests, the body params). The v2 JSON API
 * signs only the oauth params; the extra-params path exists so the
 * implementation can be checked against X's documented example, which uses a
 * form-encoded request.
 */
export function oauthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string,
): string {
  const paramString = Object.keys(params)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(params[key])}`)
    .join("&");

  const baseString = [method.toUpperCase(), percentEncode(url), percentEncode(paramString)].join("&");
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  return createHmac("sha1", signingKey).update(baseString).digest("base64");
}

/** The Authorization header for one request. Nonce and timestamp are inputs
    so the function stays deterministic and testable. */
export function buildOAuthHeader(
  method: string,
  url: string,
  extraParams: Record<string, string>,
  credentials: OAuthCredentials,
  nonce: string,
  timestampSec: number,
): string {
  const oauth: Record<string, string> = {
    oauth_consumer_key: credentials.consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(timestampSec),
    oauth_token: credentials.accessToken,
    oauth_version: "1.0",
  };

  oauth.oauth_signature = oauthSignature(
    method,
    url,
    { ...oauth, ...extraParams },
    credentials.consumerSecret,
    credentials.accessTokenSecret,
  );

  return `OAuth ${Object.keys(oauth)
    .sort()
    .map((key) => `${percentEncode(key)}="${percentEncode(oauth[key])}"`)
    .join(", ")}`;
}

/**
 * Posts to X. The v2 tweets endpoint takes a JSON body, which OAuth 1.0a does
 * not sign — only the oauth params enter the signature.
 */
async function postToX(text: string): Promise<void> {
  const { randomBytes } = await import("node:crypto");
  const url = "https://api.twitter.com/2/tweets";

  const header = buildOAuthHeader(
    "POST",
    url,
    {},
    {
      consumerKey: process.env.X_API_KEY!,
      consumerSecret: process.env.X_API_SECRET!,
      accessToken: process.env.X_ACCESS_TOKEN!,
      accessTokenSecret: process.env.X_ACCESS_TOKEN_SECRET!,
    },
    randomBytes(16).toString("hex"),
    Math.floor(Date.now() / 1000),
  );

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
