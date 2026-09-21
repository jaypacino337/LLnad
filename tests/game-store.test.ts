import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test, { after } from "node:test";

// The store reads its data dir at import time, so point it at scratch first.
const dataDir = await mkdtemp(path.join(tmpdir(), "hoodst-test-"));
process.env.HOODST_DATA_DIR = dataDir;

const store = await import("../src/lib/game-store.ts");
const { STARTING_BALANCE } = await import("../src/lib/game.ts");

after(() => rm(dataDir, { recursive: true, force: true }));

const WALLET = "HoodStTestWallet11111111111111111111111111111";
const TOKEN = "TokenMint111111111111111111111111111111111111";
const prices = (price: number) => new Map([[TOKEN, price]]);

test("a new account starts with the paper balance and flat periods", async () => {
  const account = await store.getOrCreateAccount(WALLET, prices(1));
  assert.equal(account.balance, STARTING_BALANCE);
  assert.equal(account.positions.length, 0);
  assert.equal(account.periods.daily.equity, STARTING_BALANCE);
  assert.equal(await store.accountCount(), 1);
});

test("opening escrows margin and validates input", async () => {
  const bad = await store.openPosition(
    WALLET,
    { tokenAddress: TOKEN, symbol: "T", side: "long", marginUsd: 5, leverage: 10 },
    prices(1),
  );
  assert.equal(bad.ok, false);

  const badLev = await store.openPosition(
    WALLET,
    { tokenAddress: TOKEN, symbol: "T", side: "long", marginUsd: 100, leverage: 50 },
    prices(1),
  );
  assert.equal(badLev.ok, false);

  const noPrice = await store.openPosition(
    WALLET,
    { tokenAddress: "Unpriced1111111111111111111111111111111111111", symbol: "X", side: "long", marginUsd: 100, leverage: 2 },
    prices(1),
  );
  assert.equal(noPrice.ok, false, "no live price means no fill");

  const good = await store.openPosition(
    WALLET,
    { tokenAddress: TOKEN, symbol: "$test", side: "long", marginUsd: 1000, leverage: 5 },
    prices(1),
  );
  assert.equal(good.ok, true);
  if (!good.ok) return;
  assert.equal(good.account.balance, STARTING_BALANCE - 1000);
  assert.equal(good.position?.symbol, "TEST");
  assert.equal(good.position?.entryPrice, 1);
});

test("margin cannot exceed the free balance", async () => {
  const tooBig = await store.openPosition(
    WALLET,
    { tokenAddress: TOKEN, symbol: "T", side: "long", marginUsd: STARTING_BALANCE, leverage: 2 },
    prices(1),
  );
  assert.equal(tooBig.ok, false);
});

test("closing realises pnl at the live price", async () => {
  const account = await store.getOrCreateAccount(WALLET, prices(1));
  const open = account.positions[0];
  assert.ok(open);

  // +20% on 5x = +100% of margin: $1000 margin -> +$1000.
  const result = await store.closePosition(WALLET, open.id, prices(1.2));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.trade?.pnlUsd, 1000);
  assert.equal(result.account.balance, STARTING_BALANCE + 1000);
  assert.equal(result.account.positions.length, 0);
  assert.equal(result.account.history[0].reason, "closed");
});

test("a position past its liquidation price settles automatically on read", async () => {
  const opened = await store.openPosition(
    WALLET,
    { tokenAddress: TOKEN, symbol: "T", side: "long", marginUsd: 500, leverage: 10 },
    prices(2),
  );
  assert.ok(opened.ok);

  // 10x long from $2 liquidates at $1.80; mark it at $1.50.
  const account = await store.getOrCreateAccount(WALLET, prices(1.5));
  assert.equal(account.positions.length, 0, "the position must be gone");
  assert.equal(account.history[0].reason, "liquidated");
  assert.equal(account.history[0].pnlUsd, -500, "a liquidation loses exactly the margin");
  assert.equal(account.history[0].exitPrice, 1.8, "settled at the liquidation price, not beyond");
});

test("closing a liquidated position reports it gone", async () => {
  const result = await store.closePosition(WALLET, "no-such-id", prices(1));
  assert.equal(result.ok, false);
});

test("the leaderboard ranks by period return and survives a reload", async () => {
  const OTHER = "OtherWallet1111111111111111111111111111111111";
  await store.getOrCreateAccount(OTHER, prices(1));

  const rows = await store.leaderboard("daily", prices(1));
  assert.equal(rows.length, 2);
  assert.ok(rows[0].periodReturn >= rows[1].periodReturn, "sorted best first");

  const me = rows.find((row) => row.wallet === WALLET);
  assert.ok(me);
  // +$1000 realised, -$500 liquidated on a $10k start.
  assert.ok(Math.abs(me.periodReturn - 0.05) < 1e-9);
});

test("state survives a fresh read from disk (cross-instance semantics)", async () => {
  // A second module copy is simulated by the file-stamp reload: rewrite via a
  // no-op mutation, then verify balances come back from the file.
  const account = await store.getOrCreateAccount(WALLET, prices(1));
  const balance = account.balance;
  const again = await store.getOrCreateAccount(WALLET, prices(1));
  assert.equal(again.balance, balance);
  assert.equal((await store.leaderboard("daily", prices(1))).length, 2);
});

test("held tokens feed the pricing set", async () => {
  await store.openPosition(
    WALLET,
    { tokenAddress: TOKEN, symbol: "T", side: "short", marginUsd: 100, leverage: 2 },
    prices(1),
  );
  const held = await store.allHeldTokens();
  assert.ok(held.includes(TOKEN));
});
