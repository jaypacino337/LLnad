import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

// The store reads CLONE_DATA_DIR at call time, but set it before the dynamic
// import anyway so no code path ever sees the repo's real .data directory.
process.env.CLONE_DATA_DIR = mkdtempSync(path.join(tmpdir(), "clone-store-"));

const { MAX_FEED, cityFeed, recordRound, summon, summonedClones } = await import(
  "../src/lib/clone-store.ts"
);

const MINT_A = "6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN";
const MINT_B = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";

test("summoning registers once and lands in the feed", async () => {
  const first = await summon({ mint: MINT_A, symbol: "ALPHA", name: "Alpha", dexId: "pumpswap" });
  assert.ok(first.ok && !first.already);

  const again = await summon({ mint: MINT_A, symbol: "ALPHA", name: "Alpha", dexId: "pumpswap" });
  assert.ok(again.ok && again.already);

  assert.equal(summonedClones().length, 1);
  assert.equal(cityFeed().filter((entry) => entry.kind === "summon").length, 1);
});

test("a bucket speaks once, and transitions become events", async () => {
  const say = (bucket: number, awake: boolean) => ({
    mint: MINT_B,
    symbol: "BETA",
    bucket,
    text: "the counter keeps spinning",
    place: "THE MALL",
    mind: "rules" as const,
    awake,
  });

  await recordRound([say(1, true)]);
  await recordRound([say(1, true)]); // same bucket: no duplicate line
  let speeches = cityFeed().filter((entry) => entry.mint === MINT_B && entry.kind === "speech");
  assert.equal(speeches.length, 1);

  await recordRound([say(2, true)]); // new bucket: speaks again
  speeches = cityFeed().filter((entry) => entry.mint === MINT_B && entry.kind === "speech");
  assert.equal(speeches.length, 2);

  await recordRound([say(3, false)]); // stopped trading: sleep event, no speech
  const kinds = cityFeed()
    .filter((entry) => entry.mint === MINT_B)
    .map((entry) => entry.kind);
  assert.deepEqual(kinds, ["speech", "speech", "sleep"]);

  await recordRound([say(4, true)]); // traded again: wake event plus a line
  const after = cityFeed().filter((entry) => entry.mint === MINT_B);
  assert.deepEqual(
    after.map((entry) => entry.kind),
    ["speech", "speech", "sleep", "wake", "speech"],
  );
});

test("the feed stays capped", async () => {
  for (let bucket = 10; bucket < 10 + MAX_FEED + 30; bucket++) {
    await recordRound([
      {
        mint: MINT_A,
        symbol: "ALPHA",
        bucket,
        text: `line ${bucket}`,
        place: "BBS",
        mind: "rules",
        awake: true,
      },
    ]);
  }
  assert.ok(cityFeed().length <= MAX_FEED);
  // The newest line survived the cap.
  assert.ok(cityFeed().some((entry) => entry.text === `line ${10 + MAX_FEED + 29}`));
});
