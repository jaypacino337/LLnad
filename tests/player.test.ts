import assert from "node:assert/strict";
import test from "node:test";

import { createSession, isEligible, rewardGate, signInMessage, verifySession } from "../src/lib/player.ts";

const WALLET = "HoodStTestWallet11111111111111111111111111111";

test("a fresh session verifies back to its wallet", () => {
  assert.equal(verifySession(createSession(WALLET)), WALLET);
});

test("expired and tampered sessions are rejected", () => {
  const expired = createSession(WALLET, Date.now() - 8 * 24 * 3_600_000);
  assert.equal(verifySession(expired), null);

  const token = createSession(WALLET);
  const [, expires, signature] = token.split(".");
  assert.equal(verifySession(`EvilWallet.${expires}.${signature}`), null);
  assert.equal(verifySession(`${WALLET}.${expires}.AAAA${signature.slice(4)}`), null);
  assert.equal(verifySession("garbage"), null);
  assert.equal(verifySession(undefined), null);
});

test("the sign-in message binds wallet and timestamp", () => {
  const message = signInMessage(WALLET, 1234);
  assert.match(message, /Hood ST sign-in/);
  assert.ok(message.includes(WALLET));
  assert.ok(message.includes("1234"));
});

test("reward eligibility fails closed when unconfigured", () => {
  // Test env has no HOODST_TOKEN_MINT.
  const gate = rewardGate();
  assert.equal(gate.configured, false);
  assert.equal(isEligible(1_000_000), false, "no gate configured means no eligibility badge");
  assert.equal(isEligible(null), false);
});
