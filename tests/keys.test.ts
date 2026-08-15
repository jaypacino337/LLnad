import assert from "node:assert/strict";
import test from "node:test";

import { claimKeyMatches, generateClaimKey, hashClaimKey } from "../src/lib/keys.ts";

test("generated keys are URL-safe and long enough to be unguessable", () => {
  for (let i = 0; i < 50; i += 1) {
    const key = generateClaimKey();
    assert.match(key, /^[A-Za-z0-9_-]{20,}$/);
  }
});

test("keys do not repeat", () => {
  const keys = new Set(Array.from({ length: 500 }, () => generateClaimKey()));
  assert.equal(keys.size, 500);
});

test("hashing is stable and does not return the key", () => {
  const key = generateClaimKey();
  const hash = hashClaimKey(key);
  assert.equal(hash, hashClaimKey(key));
  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.notEqual(hash, key);
  assert.ok(!hash.includes(key));
});

test("the right key opens the lock and a wrong one does not", () => {
  const key = generateClaimKey();
  const hash = hashClaimKey(key);
  assert.equal(claimKeyMatches(key, hash), true);
  assert.equal(claimKeyMatches(generateClaimKey(), hash), false);
  assert.equal(claimKeyMatches(`${key}x`, hash), false);
  assert.equal(claimKeyMatches(key.slice(0, -1), hash), false);
});

test("a plot with no key hash can never be opened", () => {
  assert.equal(claimKeyMatches(generateClaimKey(), null), false);
  assert.equal(claimKeyMatches("", null), false);
});

test("an empty or malformed key is refused without throwing", () => {
  const hash = hashClaimKey(generateClaimKey());
  assert.equal(claimKeyMatches("", hash), false);
  assert.equal(claimKeyMatches("not-a-key", hash), false);
  assert.equal(claimKeyMatches("x", "short"), false);
});
