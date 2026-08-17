import assert from "node:assert/strict";
import test from "node:test";

import { composePost, markPosted, missingAutopostEnv, runAutopost, selectForPost } from "../src/lib/autopost.ts";
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
