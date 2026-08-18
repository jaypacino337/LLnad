import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOAuthHeader,
  composePost,
  markPosted,
  missingAutopostEnv,
  oauthSignature,
  runAutopost,
  selectForPost,
} from "../src/lib/autopost.ts";
import type { Signal } from "../src/lib/signals.ts";

function signal(overrides: Partial<Signal> = {}): Signal {
  return {
    id: "pair:momentum",
    kind: "momentum",
    label: "Momentum",
    direction: "up",
    symbol: "TEST",
    name: "Test Token",
    tokenAddress: "token",
    url: "https://dexscreener.com/solana/token",
    observation: "Up 20.0% in the last hour, extending a 40.0% six-hour move.",
    strength: 0.8,
    inputs: [
      { label: "1h", value: "20.0%" },
      { label: "6h", value: "40.0%" },
    ],
    ...overrides,
  };
}

test("a composed post carries the symbol, observation, inputs and link", () => {
  const text = composePost(signal());
  assert.ok(text.includes("$TEST"));
  assert.ok(text.includes("Momentum"));
  assert.ok(text.includes("20.0%"));
  assert.ok(text.includes("https://dexscreener.com/solana/token"));
});

test("selection takes the strongest unposted signal at or above the floor", () => {
  const weak = signal({ id: "weak", strength: 0.3 });
  const strong = signal({ id: "strong", strength: 0.9 });
  assert.equal(selectForPost([strong, weak])?.id, "strong");
  assert.equal(selectForPost([weak]), null, "below-threshold signals never post");
});

test("a signal posts at most once", () => {
  const once = signal({ id: "only-once", strength: 0.9 });
  assert.equal(selectForPost([once])?.id, "only-once");
  markPosted("only-once");
  assert.equal(selectForPost([once]), null);
});

test("without credentials the runner dry-runs and sends nothing", async () => {
  // Test env has no X_* variables.
  assert.ok(missingAutopostEnv().length === 4);
  const result = await runAutopost([signal({ id: "dry", strength: 0.9 })]);
  assert.equal(result.outcome, "dry-run");
  assert.equal(result.posted, false);
  assert.ok(result.text, "the composed text is returned for inspection");
  assert.ok(result.missingEnv.length === 4);
});

test("with nothing qualifying the runner skips", async () => {
  const result = await runAutopost([signal({ id: "too-weak", strength: 0.2 })]);
  assert.equal(result.outcome, "skipped");
  assert.equal(result.text, null);
});

/**
 * The exact example from X's "Creating a signature" documentation. If this
 * signature matches, the HMAC construction, RFC 3986 encoding and parameter
 * sorting are all correct — the parts of OAuth 1.0a that actually go wrong.
 */
const X_DOC_VECTOR = {
  url: "https://api.twitter.com/1.1/statuses/update.json",
  bodyParams: {
    status: "Hello Ladies + Gentlemen, a signed OAuth request!",
    include_entities: "true",
  },
  credentials: {
    consumerKey: "xvz1evFS4wEEPTGEFPHBog",
    consumerSecret: "kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw",
    accessToken: "370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb",
    accessTokenSecret: "LswwdoUaIvS8ltyTt5jkRh4J50vUPVVHtR2YPi5kE",
  },
  nonce: "kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg",
  timestampSec: 1318622958,
  expectedSignature: "hCtSmYh+iHYCEqBWrE7C7hYmtUk=",
};

test("the OAuth signature matches X's documented test vector", () => {
  const v = X_DOC_VECTOR;
  const signature = oauthSignature(
    "POST",
    v.url,
    {
      ...v.bodyParams,
      oauth_consumer_key: v.credentials.consumerKey,
      oauth_nonce: v.nonce,
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: String(v.timestampSec),
      oauth_token: v.credentials.accessToken,
      oauth_version: "1.0",
    },
    v.credentials.consumerSecret,
    v.credentials.accessTokenSecret,
  );
  assert.equal(signature, v.expectedSignature);
});

test("the Authorization header carries that signature, percent-encoded", () => {
  const v = X_DOC_VECTOR;
  const header = buildOAuthHeader("POST", v.url, v.bodyParams, v.credentials, v.nonce, v.timestampSec);
  assert.match(header, /^OAuth /);
  assert.ok(header.includes('oauth_signature="hCtSmYh%2BiHYCEqBWrE7C7hYmtUk%3D"'));
  assert.ok(header.includes(`oauth_nonce="${v.nonce}"`));
  assert.ok(header.includes('oauth_version="1.0"'));
  // Body params are signed but never appear in the header itself.
  assert.equal(header.includes("status="), false);
});
