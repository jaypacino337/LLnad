import assert from "node:assert/strict";
import test from "node:test";

import type { MarketToken } from "../src/lib/market.ts";
import { deriveSignals, strengthLabel } from "../src/lib/signals.ts";

/** A quiet token that should trigger nothing. */
function quiet(overrides: Partial<MarketToken> = {}): MarketToken {
  return {
    pairAddress: "pair",
    tokenAddress: "token",
    name: "Quiet",
    symbol: "QUIET",
    priceUsd: 0.001,
    marketCap: 100_000,
    liquidityUsd: 50_000,
    volume1h: 1_000,
    volume6h: 6_000,
    volume24h: 20_000,
    change5m: 0,
    change1h: 1,
    change6h: 2,
    change24h: 3,
    buys1h: 10,
    sells1h: 10,
    createdAtMs: Date.now() - 7 * 24 * 3_600_000,
    dexId: "raydium",
    isPumpFun: false,
    url: "https://example.com",
    ...overrides,
  };
}

test("a quiet market produces no signals", () => {
  assert.deepEqual(deriveSignals([quiet()]), []);
});

test("volume acceleration fires at 2x the six-hour average with real size", () => {
  const token = quiet({ volume1h: 20_000, volume6h: 60_000 }); // 2x average hour
  const signals = deriveSignals([token]);
  const hit = signals.find((signal) => signal.kind === "volume_acceleration");
  assert.ok(hit, "expected the rule to fire");
  assert.equal(hit.direction, "up");
  assert.match(hit.observation, /2\.0x/);
});

test("volume acceleration does not fire on tiny absolute volume", () => {
  const token = quiet({ volume1h: 4_000, volume6h: 6_000 }); // 4x but under $5k
  assert.equal(
    deriveSignals([token]).some((signal) => signal.kind === "volume_acceleration"),
    false,
  );
});

test("momentum needs both a strong hour and a positive six hours", () => {
  const fires = quiet({ change1h: 20, change6h: 5 });
  const fadesBack = quiet({ change1h: 20, change6h: -10 });
  assert.ok(deriveSignals([fires]).some((signal) => signal.kind === "momentum"));
  assert.equal(deriveSignals([fadesBack]).some((signal) => signal.kind === "momentum"), false);
});

test("buy and sell pressure need enough trades to mean anything", () => {
  const thin = quiet({ buys1h: 10, sells1h: 1 }); // 91% buys but only 11 trades
  assert.equal(deriveSignals([thin]).some((signal) => signal.kind === "buy_pressure"), false);

  const real = quiet({ buys1h: 80, sells1h: 20 });
  const hit = deriveSignals([real]).find((signal) => signal.kind === "buy_pressure");
  assert.ok(hit);
  assert.match(hit.observation, /80% of the last 100 trades/);

  const dumping = quiet({ buys1h: 20, sells1h: 80 });
  assert.ok(deriveSignals([dumping]).some((signal) => signal.kind === "sell_pressure"));
});

test("thin liquidity compares market cap to the pool", () => {
  const thin = quiet({ marketCap: 5_000_000, liquidityUsd: 50_000 }); // 100x
  const hit = deriveSignals([thin]).find((signal) => signal.kind === "thin_liquidity");
  assert.ok(hit);
  assert.equal(hit.direction, "down");
  assert.match(hit.observation, /100x/);
});

test("fresh launch needs youth and real volume", () => {
  const young = quiet({ createdAtMs: Date.now() - 30 * 60_000, volume1h: 50_000, volume6h: 50_000 });
  assert.ok(deriveSignals([young]).some((signal) => signal.kind === "fresh_launch"));

  const old = quiet({ createdAtMs: Date.now() - 24 * 3_600_000, volume1h: 50_000 });
  assert.equal(deriveSignals([old]).some((signal) => signal.kind === "fresh_launch"), false);
});

test("every signal quotes the inputs it used", () => {
  const busy = quiet({
    volume1h: 40_000,
    volume6h: 60_000,
    change1h: 30,
    change6h: 50,
    buys1h: 90,
    sells1h: 10,
  });
  for (const signal of deriveSignals([busy])) {
    assert.ok(signal.inputs.length > 0, `${signal.kind} must list its inputs`);
    assert.ok(signal.observation.length > 0);
    assert.ok(signal.strength >= 0 && signal.strength <= 1);
  }
});

test("the same snapshot always produces the same output", () => {
  const tokens = [
    quiet({ pairAddress: "a", volume1h: 30_000, volume6h: 60_000 }),
    quiet({ pairAddress: "b", change1h: 25, change6h: 40 }),
  ];
  assert.deepEqual(deriveSignals(tokens), deriveSignals(tokens));
});

test("signals sort strongest first and respect the limit", () => {
  const strong = quiet({ pairAddress: "s", volume1h: 100_000, volume6h: 120_000 });
  const weak = quiet({ pairAddress: "w", volume1h: 11_000, volume6h: 30_000 });
  const signals = deriveSignals([weak, strong]);
  assert.ok(signals.length >= 2);
  assert.ok(signals[0].strength >= signals[signals.length - 1].strength);
  assert.equal(deriveSignals([weak, strong], 1).length, 1);
});

test("strength labels bucket sensibly", () => {
  assert.equal(strengthLabel(0.9), "high");
  assert.equal(strengthLabel(0.5), "medium");
  assert.equal(strengthLabel(0.1), "low");
});
