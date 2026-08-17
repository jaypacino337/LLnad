import assert from "node:assert/strict";
import test from "node:test";

import { age, compact, pct, shortAddress, usd } from "../src/lib/format.ts";

test("usd scales through K, M and B", () => {
  assert.equal(usd(2_840_000), "$2.84M");
  assert.equal(usd(1_500), "$1.5K");
  assert.equal(usd(2_100_000_000), "$2.10B");
  assert.equal(usd(3.5), "$3.50");
});

test("sub-dollar token prices keep significant digits", () => {
  assert.equal(usd(0.004182), "$0.00418");
  assert.equal(usd(0.00000841), "$0.00000841");
});

test("missing values render as a dash, never as zero", () => {
  assert.equal(usd(null), "—");
  assert.equal(usd(undefined), "—");
  assert.equal(usd(Number.NaN), "—");
  assert.equal(compact(null), "—");
  assert.equal(pct(null), "—");
  assert.equal(age(null), "—");
});

test("pct signs positive moves", () => {
  assert.equal(pct(12.34), "+12.3%");
  assert.equal(pct(-8.2), "-8.2%");
});

test("age compresses to s/m/h/d", () => {
  const now = 1_000_000_000_000;
  assert.equal(age(now - 30_000, now), "30s");
  assert.equal(age(now - 5 * 60_000, now), "5m");
  assert.equal(age(now - 3 * 3_600_000, now), "3h");
  assert.equal(age(now - 72 * 3_600_000, now), "3d");
});

test("addresses shorten with head and tail preserved", () => {
  assert.equal(shortAddress("So11111111111111111111111111111111111111112"), "So11…1112");
  assert.equal(shortAddress("short"), "short");
});
