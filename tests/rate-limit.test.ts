import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";

import {
  checkClaimRate,
  checkEditRate,
  checkRate,
  clientKey,
  resetRateLimitsForTests,
} from "../src/lib/rate-limit.ts";

beforeEach(() => resetRateLimitsForTests());

const NOW = 1_700_000_000_000;

test("a client may act up to the limit, then is refused", () => {
  for (let i = 0; i < 3; i += 1) {
    const result = checkRate("test", "client-a", 3, 60_000, NOW);
    assert.equal(result.allowed, true, `attempt ${i + 1}`);
  }
  const blocked = checkRate("test", "client-a", 3, 60_000, NOW);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds > 0);
});

test("remaining counts down to zero", () => {
  assert.equal(checkRate("test", "b", 3, 60_000, NOW).remaining, 2);
  assert.equal(checkRate("test", "b", 3, 60_000, NOW).remaining, 1);
  assert.equal(checkRate("test", "b", 3, 60_000, NOW).remaining, 0);
});

test("clients are limited independently", () => {
  checkRate("test", "one", 1, 60_000, NOW);
  assert.equal(checkRate("test", "one", 1, 60_000, NOW).allowed, false);
  assert.equal(checkRate("test", "two", 1, 60_000, NOW).allowed, true, "a busy neighbour is not my problem");
});

test("buckets are limited independently, so editing is not blocked by claiming", () => {
  checkRate("claim", "same-client", 1, 60_000, NOW);
  assert.equal(checkRate("claim", "same-client", 1, 60_000, NOW).allowed, false);
  assert.equal(checkRate("edit", "same-client", 1, 60_000, NOW).allowed, true);
});

test("the window slides, so a blocked client recovers", () => {
  checkRate("test", "c", 1, 60_000, NOW);
  assert.equal(checkRate("test", "c", 1, 60_000, NOW).allowed, false);
  assert.equal(checkRate("test", "c", 1, 60_000, NOW + 60_001).allowed, true);
});

test("retry-after shrinks as the window advances", () => {
  checkRate("test", "d", 1, 60_000, NOW);
  const early = checkRate("test", "d", 1, 60_000, NOW + 1_000);
  const later = checkRate("test", "d", 1, 60_000, NOW + 30_000);
  assert.ok(later.retryAfterSeconds < early.retryAfterSeconds);
});

test("claiming is limited harder than editing", () => {
  let claims = 0;
  while (checkClaimRate("e", NOW).allowed) claims += 1;
  let edits = 0;
  while (checkEditRate("e", NOW).allowed) edits += 1;
  assert.ok(claims > 0);
  assert.ok(edits > claims, "fiddling with your own plot should be cheaper than taking new ground");
});

test("client identity prefers the forwarded-for chain", () => {
  assert.equal(clientKey(new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" })), "1.2.3.4");
  assert.equal(clientKey(new Headers({ "x-real-ip": "9.9.9.9" })), "9.9.9.9");
  assert.equal(clientKey(new Headers()), "unknown");
});
