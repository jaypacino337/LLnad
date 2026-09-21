import assert from "node:assert/strict";
import test from "node:test";

import {
  STARTING_BALANCE,
  dailyKey,
  equity,
  isLiquidated,
  liquidationPrice,
  monthlyKey,
  periodKey,
  positionPnl,
  positionSize,
  weeklyKey,
  type Account,
  type Position,
} from "../src/lib/game.ts";

function near(actual: number, expected: number) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} !~ ${expected}`);
}

function position(overrides: Partial<Position> = {}): Position {
  return {
    id: "p1",
    tokenAddress: "token",
    symbol: "TEST",
    side: "long",
    marginUsd: 100,
    leverage: 10,
    entryPrice: 2,
    openedAt: new Date().toISOString(),
    ...overrides,
  };
}

test("size is margin times leverage at the entry price", () => {
  assert.equal(positionSize(position()), 500); // $100 * 10x / $2
});

test("long pnl rises with price, short pnl falls", () => {
  const long = position();
  near(positionPnl(long, 2.2), 100); // +10% * 10x on $100
  near(positionPnl(long, 1.9), -50);

  const short = position({ side: "short" });
  near(positionPnl(short, 1.8), 100);
  near(positionPnl(short, 2.1), -50);
});

test("loss is floored at the margin — isolated means isolated", () => {
  const long = position();
  assert.equal(positionPnl(long, 0), -100);
  const short = position({ side: "short" });
  assert.equal(positionPnl(short, 100), -100);
});

test("liquidation price is a 1/leverage move against the position", () => {
  assert.equal(liquidationPrice(position()), 1.8); // 2 * (1 - 1/10)
  assert.equal(liquidationPrice(position({ side: "short" })), 2.2);
  assert.equal(liquidationPrice(position({ leverage: 1 })), 0); // 1x long cannot liquidate above zero
});

test("liquidation triggers exactly at the boundary", () => {
  const long = position();
  assert.equal(isLiquidated(long, 1.81), false);
  assert.equal(isLiquidated(long, 1.8), true);

  const short = position({ side: "short" });
  assert.equal(isLiquidated(short, 2.19), false);
  assert.equal(isLiquidated(short, 2.2), true);
});

test("at the liquidation price the pnl equals minus the margin", () => {
  const long = position();
  near(positionPnl(long, liquidationPrice(long)), -100);
  const short = position({ side: "short", leverage: 4 });
  near(positionPnl(short, liquidationPrice(short)), -100);
});

test("equity is balance plus marked positions, entry value when unpriced", () => {
  const account: Account = {
    wallet: "w",
    createdAt: new Date().toISOString(),
    balance: STARTING_BALANCE - 100,
    positions: [position()],
    history: [],
    periods: {
      daily: { key: "k", equity: STARTING_BALANCE },
      weekly: { key: "k", equity: STARTING_BALANCE },
      monthly: { key: "k", equity: STARTING_BALANCE },
    },
    held: null,
  };

  const priced = new Map([["token", 2.2]]);
  assert.equal(equity(account, priced), STARTING_BALANCE + 100);

  // Flat price: exactly the starting balance again.
  assert.equal(equity(account, new Map([["token", 2]])), STARTING_BALANCE);

  // No price: margin counts at face value, no invented pnl.
  assert.equal(equity(account, new Map()), STARTING_BALANCE);
});

test("period keys are UTC and stable", () => {
  const date = new Date("2026-09-21T13:45:00Z");
  assert.equal(dailyKey(date), "2026-09-21");
  assert.equal(monthlyKey(date), "2026-09");
  assert.equal(weeklyKey(date), "2026-W39");
  assert.equal(periodKey("weekly", date), "2026-W39");
});

test("ISO weeks handle year boundaries", () => {
  // 2027-01-01 is a Friday, part of 2026's ISO week 53.
  assert.equal(weeklyKey(new Date("2027-01-01T00:00:00Z")), "2026-W53");
  // 2025-12-29 is a Monday, part of 2026's ISO week 1.
  assert.equal(weeklyKey(new Date("2025-12-29T12:00:00Z")), "2026-W01");
});
