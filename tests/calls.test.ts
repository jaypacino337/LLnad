import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test, { after } from "node:test";

// The store reads its data dir at import time, so point it at scratch first.
const dataDir = await mkdtemp(path.join(tmpdir(), "pumpxbt-test-"));
process.env.PUMPXBT_DATA_DIR = dataDir;

const calls = await import("../src/lib/calls.ts");

after(() => rm(dataDir, { recursive: true, force: true }));

const MINT = "So11111111111111111111111111111111111111112";

test("the record starts empty", async () => {
  assert.deepEqual(await calls.getCalls(), []);
});

test("publishing requires a symbol, an address and a positive entry cap", async () => {
  assert.equal((await calls.publishCall({ symbol: "", tokenAddress: MINT, entryMarketCap: 1 })).ok, false);
  assert.equal((await calls.publishCall({ symbol: "A", tokenAddress: "short", entryMarketCap: 1 })).ok, false);
  assert.equal((await calls.publishCall({ symbol: "A", tokenAddress: MINT, entryMarketCap: 0 })).ok, false);
  assert.equal(
    (await calls.publishCall({ symbol: "A", tokenAddress: MINT, entryMarketCap: Number.NaN })).ok,
    false,
  );
});

test("a valid call is recorded, normalised, and starts open with no market data", async () => {
  const result = await calls.publishCall({ symbol: "$test", tokenAddress: MINT, entryMarketCap: 120_000 });
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.call.symbol, "TEST", "symbol is upper-cased and loses the $");
  assert.equal(result.call.status, "open");
  assert.equal(result.call.currentMarketCap, null, "no fabricated current cap");
  assert.equal(result.call.peakMarketCap, null);

  const listed = await calls.getCalls();
  assert.equal(listed.length, 1);
});

test("a second open call on the same token is refused", async () => {
  const result = await calls.publishCall({ symbol: "AGAIN", tokenAddress: MINT, entryMarketCap: 1_000 });
  assert.equal(result.ok, false);
});

test("closing a call keeps it on the record", async () => {
  const [open] = await calls.getCalls();
  const closed = await calls.closeCall(open.id);
  assert.equal(closed.ok, true);

  const listed = await calls.getCalls();
  assert.equal(listed.length, 1, "closed calls stay on the record");
  assert.equal(listed[0].status, "closed");

  assert.equal((await calls.closeCall(open.id)).ok, false, "cannot close twice");
  assert.equal((await calls.closeCall("missing")).ok, false);
});

test("the return multiple is only computed from recorded numbers", () => {
  const call = {
    id: "x",
    symbol: "X",
    tokenAddress: MINT,
    calledAt: new Date().toISOString(),
    entryMarketCap: 100_000,
    currentMarketCap: null,
    peakMarketCap: null,
    lastRefreshedAt: null,
    status: "open" as const,
  };
  assert.equal(calls.callMultiple(call), null, "no current cap, no multiple");
  assert.equal(calls.callMultiple({ ...call, currentMarketCap: 250_000 }), 2.5);
});
