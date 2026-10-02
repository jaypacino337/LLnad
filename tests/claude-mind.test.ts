import assert from "node:assert/strict";
import test from "node:test";

import { isGrounded, mindMode } from "../src/lib/claude-mind.ts";

const ALLOWED = ["+2.1%", "-5.4%", "$14.0K", "$320.0K", "$1.20M", "$85.0K", "70", "41", "29", "$TEST"];

test("mind mode follows the key", () => {
  const previous = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  assert.equal(mindMode(), "rules");
  process.env.ANTHROPIC_API_KEY = "test-key";
  assert.equal(mindMode(), "claude");
  if (previous === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = previous;
});

test("lines quoting only live figures pass", () => {
  assert.ok(isGrounded("up +2.1% on $14.0K of volume, feeling fine", ALLOWED));
  assert.ok(isGrounded("41 buys to 29 sells. balance.", ALLOWED));
  assert.ok(isGrounded("no numbers at all, just vibes", ALLOWED));
  // Small bare integers (counts in prose) and the 404 place are allowed.
  assert.ok(isGrounded("told the same joke 3 times at the 404", ALLOWED));
});

test("invented figures are rejected", () => {
  assert.ok(!isGrounded("we're going +900% this week", ALLOWED));
  assert.ok(!isGrounded("$5M market cap incoming", ALLOWED));
  assert.ok(!isGrounded("price target $1,000", ALLOWED));
  assert.ok(!isGrounded("up 50x since yesterday (50 is > 24)", ALLOWED));
});
