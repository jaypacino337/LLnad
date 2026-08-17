import assert from "node:assert/strict";
import { generateKeyPairSync, sign as cryptoSign } from "node:crypto";
import test from "node:test";

import { base58Decode, base58Encode, verifySolanaSignature } from "../src/lib/solana.ts";

test("base58 round-trips arbitrary bytes", () => {
  const cases = [
    new Uint8Array([]),
    new Uint8Array([0]),
    new Uint8Array([0, 0, 1, 2, 3]),
    new Uint8Array([255, 254, 253]),
    Uint8Array.from({ length: 32 }, (_, index) => (index * 7) % 256),
  ];
  for (const bytes of cases) {
    assert.deepEqual(base58Decode(base58Encode(bytes)), bytes);
  }
});

test("base58 matches a known vector", () => {
  // "hello" in base58 is Cn8eVZg.
  assert.equal(base58Encode(new TextEncoder().encode("hello")), "Cn8eVZg");
  assert.deepEqual(base58Decode("Cn8eVZg"), new TextEncoder().encode("hello"));
});

test("base58 rejects invalid characters", () => {
  assert.throws(() => base58Decode("0OIl"));
});

function makeWallet() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  // Raw 32-byte key is the tail of the SPKI DER export.
  const spki = publicKey.export({ format: "der", type: "spki" });
  const raw = new Uint8Array(spki.subarray(spki.length - 32));
  return { address: base58Encode(raw), privateKey };
}

test("a genuine wallet signature verifies", () => {
  const wallet = makeWallet();
  const message = new TextEncoder().encode(`PumpXBT Pro verification\nwallet: ${wallet.address}\nts: 123`);
  const signature = new Uint8Array(cryptoSign(null, Buffer.from(message), wallet.privateKey));
  assert.equal(verifySolanaSignature(message, signature, wallet.address), true);
});

test("a tampered message or wrong wallet fails verification", () => {
  const wallet = makeWallet();
  const other = makeWallet();
  const message = new TextEncoder().encode("PumpXBT Pro verification");
  const signature = new Uint8Array(cryptoSign(null, Buffer.from(message), wallet.privateKey));

  assert.equal(
    verifySolanaSignature(new TextEncoder().encode("Different message"), signature, wallet.address),
    false,
  );
  assert.equal(verifySolanaSignature(message, signature, other.address), false);
});

test("malformed inputs fail closed instead of throwing", () => {
  const message = new TextEncoder().encode("m");
  assert.equal(verifySolanaSignature(message, new Uint8Array(10), "notbase58!!!"), false);
  assert.equal(verifySolanaSignature(message, new Uint8Array(64), "111"), false);
});
