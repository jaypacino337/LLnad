import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { fakePostgrest, installFakeSupabase } from "./fake-postgrest.ts";

process.env.SEATS_DATA_DIR = mkdtempSync(path.join(tmpdir(), "seats-"));

const { base58, claimCode, claimWithPost, postTime, seatPhrase, SeatError } = await import("../src/lib/seats/core.ts");
const { ensureCoin, fileSeatStore, seatStore } = await import("../src/lib/seats/store.ts");
const { tokenConfig } = await import("../src/lib/seats/config.ts");

const W = (n: number) => base58(Uint8Array.from({ length: 32 }, (_, i) => (i * 7 + n * 13 + 1) % 256));
const MINT = W(99);
const CREATOR = W(0);
const HANDLE = "clonecity";

function setEnv(extra: Record<string, string | undefined> = {}) {
  Object.assign(process.env, {
    CLONE_TOKEN_MINT: MINT,
    CLONE_TOKEN_CREATOR: CREATOR,
    CLONE_X_HANDLE: HANDLE,
    CLONE_SEAT_CAP: "10",
    CLONE_SEAT_MIN_HOLD: "250000",
    ...extra,
  });
}

function postFor(wallet: string, x: string, n: number) {
  const id = (((BigInt(Date.now()) + BigInt(n) * 1000n - 1288834974657n) << 22n) | 1n).toString();
  return { id, handle: x, text: seatPhrase(HANDLE, "CLONE", claimCode(MINT, wallet)), postedAt: postTime(id) };
}

test("token config: closed until every required value is set", () => {
  assert.deepEqual(tokenConfig({}), {
    ok: false,
    missing: ["CLONE_TOKEN_MINT", "CLONE_TOKEN_CREATOR", "CLONE_X_HANDLE", "CLONE_SEAT_CAP", "CLONE_SEAT_MIN_HOLD"],
  });
  const result = tokenConfig({
    CLONE_TOKEN_MINT: MINT,
    CLONE_TOKEN_CREATOR: CREATOR,
    CLONE_X_HANDLE: "@clonecity",
    CLONE_SEAT_CAP: "100",
    CLONE_SEAT_MIN_HOLD: "0",
  });
  assert.ok(result.ok);
  assert.equal(result.config.handle, "clonecity");
  assert.equal(result.config.symbol, "CLONE");
});

test("file backend: ensureCoin creates once from env and never resets", async () => {
  setEnv();
  const coin = await ensureCoin(fileSeatStore);
  assert.equal(coin?.seats[0].wallet, CREATOR, "creator holds seat 1A");
  await fileSeatStore.updateCoin(MINT, (c) => claimWithPost(c, W(1), postFor(W(1), "ann", 1), HANDLE));
  setEnv({ CLONE_SEAT_CAP: "999" });
  const again = await ensureCoin(fileSeatStore);
  assert.equal(again?.seats.length, 2);
  assert.equal(again?.seatCap, 10, "env edits after creation don't touch the live registry");
});

test("supabase backend: 30 simultaneous claims on 10 seats → 10 seated, rest waitlisted, nothing lost", async () => {
  const fake = fakePostgrest({ seat_coins: "mint" });
  const restore = installFakeSupabase(fake);
  try {
    setEnv();
    const store = seatStore();
    assert.notEqual(store, fileSeatStore);
    await ensureCoin(store);
    const results = await Promise.all(
      Array.from({ length: 30 }, (_, i) =>
        store.updateCoin(MINT, (c) => claimWithPost(c, W(i + 1), postFor(W(i + 1), `user${i}`, i), HANDLE)),
      ),
    );
    const coin = await store.getCoin(MINT);
    assert.equal(coin?.seats.length, 10);
    assert.equal(coin?.waitlist.length, 21);
    assert.equal(results.filter((r) => r.status === "seated").length, 9);
    assert.equal(fake.row("seat_coins", MINT)?.version, 30);
    // Duplicates are still rejected through the store.
    await assert.rejects(
      store.updateCoin(MINT, (c) => claimWithPost(c, W(1), postFor(W(1), "user0", 99), HANDLE)),
      (error: unknown) => error instanceof SeatError,
    );
    await assert.rejects(store.updateCoin(W(50), () => 1), /Unknown coin/);
  } finally {
    restore();
  }
});
