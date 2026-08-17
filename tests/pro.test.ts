import assert from "node:assert/strict";
import test from "node:test";

import { createProSession, getProState, proMessage, verifyProSession } from "../src/lib/pro.ts";

const WALLET = "7f4kQ2example1111111111111111111111111111111";

test("a fresh session verifies back to its wallet", () => {
  const token = createProSession(WALLET);
  assert.equal(verifyProSession(token), WALLET);
});

test("an expired session is rejected", () => {
  const token = createProSession(WALLET, Date.now() - 48 * 3_600_000);
  assert.equal(verifyProSession(token), null);
});

test("a tampered session is rejected", () => {
  const token = createProSession(WALLET);
  const [, expires, signature] = token.split(".");
  assert.equal(verifyProSession(`EvilWallet.${expires}.${signature}`), null);
  assert.equal(verifyProSession(`${WALLET}.${expires}.AAAA${signature.slice(4)}`), null);
  assert.equal(verifyProSession("garbage"), null);
  assert.equal(verifyProSession(undefined), null);
});

test("the verification message binds wallet and timestamp", () => {
  const message = proMessage(WALLET, 1234);
  assert.match(message, /PumpXBT Pro verification/);
  assert.ok(message.includes(WALLET));
  assert.ok(message.includes("1234"));
});

test("pro state is locked without configuration and never invents an unlock", () => {
  // Test env has no PUMPXBT_TOKEN_MINT / SOLANA_RPC_URL.
  const state = getProState(createProSession(WALLET));
  assert.equal(state.configured, false);
  assert.equal(state.unlocked, false, "a session must not unlock an unconfigured gate");
  assert.ok(state.missingEnv.length > 0);
});
