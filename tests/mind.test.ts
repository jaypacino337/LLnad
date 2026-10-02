import assert from "node:assert/strict";
import test from "node:test";

import { ground, situationFor, speechBucket, speechFor, SPEECH_BUCKET_MS } from "../src/lib/mind.ts";
import type { LiveStats } from "../src/lib/world.ts";
import { personaFor } from "../src/lib/world.ts";

const MINTS = [
  "6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN",
  "So11111111111111111111111111111111111111112",
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
];

function stats(overrides: Partial<LiveStats> = {}): LiveStats {
  return {
    priceUsd: 0.0042,
    marketCap: 1_200_000,
    liquidityUsd: 85_000,
    volume1h: 14_000,
    volume24h: 320_000,
    change1h: 2.1,
    change24h: -5.4,
    buys1h: 41,
    sells1h: 29,
    ...overrides,
  };
}

test("situations classify from live fields", () => {
  assert.equal(situationFor(stats({ volume1h: 0, buys1h: 0, sells1h: 0 })), "sleeping");
  assert.equal(situationFor(stats({ change1h: 25 })), "euphoric");
  assert.equal(situationFor(stats({ change1h: 6 })), "pumping");
  assert.equal(situationFor(stats({ change1h: -6 })), "dumping");
  assert.equal(situationFor(stats({ change1h: -30 })), "wrecked");
  assert.equal(situationFor(stats({ change1h: 0.2, volume1h: 80 })), "quiet");
  assert.equal(situationFor(stats({ change1h: 0.2 })), "steady");
});

test("speech is deterministic within a bucket and non-empty", () => {
  const persona = personaFor(MINTS[0]);
  const a = speechFor(MINTS[0], "TEST", persona, stats(), "THE MALL", 100);
  const b = speechFor(MINTS[0], "TEST", persona, stats(), "THE MALL", 100);
  assert.deepEqual(a, b);
  assert.equal(a.mind, "rules");
  assert.ok(a.text.length > 10);
});

test("lines rotate across buckets", () => {
  const persona = personaFor(MINTS[0]);
  const texts = new Set(
    Array.from({ length: 12 }, (_, bucket) =>
      speechFor(MINTS[0], "TEST", persona, stats(), "THE MALL", bucket).text,
    ),
  );
  assert.ok(texts.size > 1);
});

test("every figure in every line is a live reading", () => {
  const cases: LiveStats[] = [
    stats(),
    stats({ change1h: 31 }),
    stats({ change1h: 9 }),
    stats({ change1h: -9 }),
    stats({ change1h: -40 }),
    stats({ volume1h: 90 }),
    stats({ volume1h: 0, buys1h: 0, sells1h: 0 }),
    stats({ change1h: null, change24h: null, volume1h: 1, marketCap: null, liquidityUsd: null }),
  ];
  for (const mint of MINTS) {
    const persona = personaFor(mint);
    for (const current of cases) {
      const grounded = ground("TEST", current, "THE MALL");
      const allowed = Object.values(grounded).join(" | ");
      for (let bucket = 0; bucket < 24; bucket++) {
        const { text } = speechFor(mint, "TEST", persona, current, "THE MALL", bucket);
        // Every numeric token in the line must appear inside a grounded field.
        for (const raw of text.match(/\$?\d[\d,.]*%?/g) ?? []) {
          const token = raw.replace(/[.,]+$/, "");
          if (token === "404" || token === "24") continue; // place name / "24h" phrasing
          assert.ok(
            allowed.includes(token),
            `ungrounded "${token}" in "${text}" (allowed: ${allowed})`,
          );
        }
      }
    }
  }
});

test("speech buckets tick every ten minutes", () => {
  const t = Date.UTC(2026, 9, 2, 12, 0, 0);
  assert.equal(speechBucket(t), speechBucket(t + SPEECH_BUCKET_MS - 1));
  assert.equal(speechBucket(t + SPEECH_BUCKET_MS), speechBucket(t) + 1);
});
