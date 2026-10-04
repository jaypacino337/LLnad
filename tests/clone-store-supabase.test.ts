import assert from "node:assert/strict";
import test from "node:test";

import { fakePostgrest, installFakeSupabase } from "./fake-postgrest.ts";

const fake = fakePostgrest({ clone_city: "id" });
const restore = installFakeSupabase(fake);
test.after(restore);

const { MAX_SUMMONED, cityFeed, recordRound, storeKind, summon, summonedClones } = await import(
  "../src/lib/clone-store.ts"
);

const mint = (n: number) => `Mint${String(n).padStart(4, "0")}${"1".repeat(36)}`;

test("Supabase is selected by env, and the first write creates the row", async () => {
  assert.equal(storeKind(), "supabase");
  assert.deepEqual(await summonedClones(), []); // missing row reads as an empty city
  const result = await summon({ mint: mint(0), symbol: "ZERO", name: "Zero", dexId: "pumpswap" });
  assert.ok(result.ok && !result.already);
  assert.equal(fake.row("clone_city", "city")?.version, 1);
  assert.equal((await cityFeed()).filter((entry) => entry.kind === "summon").length, 1);
});

test("parallel summons from many instances lose nothing (optimistic locking)", async () => {
  const before = fake.row("clone_city", "city")!.version;
  const results = await Promise.all(
    Array.from({ length: 20 }, (_, i) => summon({ mint: mint(i + 1), symbol: `S${i}`, name: `S${i}`, dexId: "x" })),
  );
  assert.ok(results.every((result) => result.ok && !result.already));
  assert.equal((await summonedClones()).length, 21);
  assert.equal(fake.row("clone_city", "city")!.version, before + 20, "exactly one version bump per summon");
  assert.ok(fake.stats().conflicts > 0, "the race was real: some writes had to retry");
});

test("the city cap holds under a concurrent stampede", async () => {
  const results = await Promise.all(
    Array.from({ length: MAX_SUMMONED + 15 }, (_, i) => summon({ mint: mint(100 + i), symbol: "R", name: "R", dexId: "x" })),
  );
  assert.equal((await summonedClones()).length, MAX_SUMMONED);
  assert.ok(results.some((result) => !result.ok));
});

test("a no-op speech round does not write", async () => {
  const candidate = { mint: mint(1), symbol: "S0", bucket: 7, text: "hi", place: "BBS", mind: "rules" as const, awake: true };
  await recordRound([candidate]);
  const version = fake.row("clone_city", "city")!.version;
  await recordRound([candidate]); // same bucket, same state
  assert.equal(fake.row("clone_city", "city")!.version, version);
});
