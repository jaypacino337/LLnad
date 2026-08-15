import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test, { after } from "node:test";

// The store reads its data directory once, at import time, so the environment
// has to be pointed at a scratch directory before the module is loaded.
const dataDir = await mkdtemp(path.join(tmpdir(), "solanda-test-"));
process.env.SOLANDA_DATA_DIR = dataDir;

const store = await import("../src/lib/store.ts");
const { GRID_COLS, GRID_ROWS } = await import("../src/lib/land.ts");

after(() => rm(dataDir, { recursive: true, force: true }));

const CLAIM = {
  title: "Test Plot",
  handle: "tester",
  url: null,
  bio: null,
  color: "moss",
  glyph: "✦",
};

async function readRegister() {
  const raw = await readFile(path.join(dataDir, "plots.json"), "utf8");
  return JSON.parse(raw) as { version: number; plots: Record<string, unknown>[] };
}

test("the register seeds itself on first use", async () => {
  const plots = await store.listPlots();
  assert.ok(plots.length > 0, "a fresh install should not show an empty map");

  const file = await readRegister();
  assert.equal(file.plots.length, plots.length, "the seed is written straight to disk");
});

test("the addresses these tests claim are not already in the founding seed", async () => {
  const seeded = new Set((await store.listPlots()).map((plot) => plot.coord));
  const scratch = ["B2", "D4", "F6", "G7", "H8", "I9", "J10", "K11", "L12", "M13", "S20", "S21", "P16", "Q17", "Z60", "T22", "T23"];
  for (const coord of scratch) {
    assert.equal(seeded.has(coord), false, `${coord} collides with the seed, pick another`);
  }
});

test("stats agree with the register", async () => {
  const plots = await store.listPlots();
  const stats = await store.getStats();
  assert.equal(stats.total, GRID_COLS * GRID_ROWS);
  assert.equal(stats.claimed, plots.length);
  assert.equal(stats.available, stats.total - stats.claimed);
  assert.ok(stats.settlers <= stats.claimed);
});

test("claiming returns a key and puts the plot on the map", async () => {
  const result = await store.claimPlot({ ...CLAIM, coord: "B2" });
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.ok(result.claimKey.length > 10);
  assert.equal(result.plot.coord, "B2");
  assert.equal(result.plot.updatedAt, null);
  assert.ok(await store.getPlot("B2"));
});

test("a public plot never carries the owner's secret", async () => {
  const plot = await store.getPlot("B2");
  assert.ok(plot);
  assert.equal("keyHash" in (plot as object), false, "the hash must not reach a caller");

  const listed = await store.listPlots();
  for (const entry of listed) {
    assert.equal("keyHash" in (entry as object), false);
  }
});

test("the key hash is stored on disk so ownership survives a restart", async () => {
  const file = await readRegister();
  const record = file.plots.find((entry) => entry.coord === "B2");
  assert.ok(record);
  assert.equal(typeof record.keyHash, "string");
});

test("an address cannot be claimed twice", async () => {
  const again = await store.claimPlot({ ...CLAIM, coord: "B2", handle: "squatter" });
  assert.equal(again.ok, false);
  if (again.ok) return;
  assert.equal(again.reason, "taken");
  assert.equal(again.plot.handle, "tester", "the original holder keeps it");
});

test("addresses off the map are refused", async () => {
  const result = await store.claimPlot({ ...CLAIM, coord: "ZZ99" });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, "out-of-bounds");
});

test("two claims racing for one address produce exactly one winner", async () => {
  const [first, second] = await Promise.all([
    store.claimPlot({ ...CLAIM, coord: "D4", handle: "one" }),
    store.claimPlot({ ...CLAIM, coord: "D4", handle: "two" }),
  ]);
  const winners = [first, second].filter((result) => result.ok);
  assert.equal(winners.length, 1, "an address must not be handed to two settlers");
});

test("concurrent claims on different addresses all survive the write queue", async () => {
  const coords = ["F6", "G7", "H8", "I9", "J10"];
  const results = await Promise.all(
    coords.map((coord) => store.claimPlot({ ...CLAIM, coord, handle: "crowd" })),
  );
  assert.ok(results.every((result) => result.ok));

  const file = await readRegister();
  for (const coord of coords) {
    assert.ok(
      file.plots.some((entry) => entry.coord === coord),
      `${coord} should have reached the file`,
    );
  }
});

test("the register survives being re-read from disk", async () => {
  const before = await store.listPlots();
  store.resetCacheForTests();
  const after = await store.listPlots();

  assert.equal(after.length, before.length);
  const reloaded = await store.getPlot("B2");
  assert.equal(reloaded?.title, "Test Plot");
});

test("the owner can edit their plot with the right key", async () => {
  const claim = await store.claimPlot({ ...CLAIM, coord: "K11" });
  assert.ok(claim.ok);
  if (!claim.ok) return;

  const result = await store.updatePlot("K11", claim.claimKey, {
    title: "Renamed",
    bio: "Now with a description.",
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.title, "Renamed");
  assert.equal(result.value.bio, "Now with a description.");
  assert.ok(result.value.updatedAt, "an edit is timestamped");
  assert.equal(result.value.handle, "tester", "the handle is not editable");
});

test("an edit only touches the fields it names", async () => {
  const claim = await store.claimPlot({
    ...CLAIM,
    coord: "L12",
    bio: "Keep me",
    url: "https://example.com/",
  });
  assert.ok(claim.ok);
  if (!claim.ok) return;

  const result = await store.updatePlot("L12", claim.claimKey, { title: "Only the title" });
  assert.ok(result.ok);
  if (!result.ok) return;

  assert.equal(result.value.title, "Only the title");
  assert.equal(result.value.bio, "Keep me");
  assert.equal(result.value.url, "https://example.com/");
});

test("a link can be deliberately cleared", async () => {
  const claim = await store.claimPlot({ ...CLAIM, coord: "M13", url: "https://example.com/" });
  assert.ok(claim.ok);
  if (!claim.ok) return;

  const result = await store.updatePlot("M13", claim.claimKey, { url: null });
  assert.ok(result.ok);
  if (!result.ok) return;
  assert.equal(result.value.url, null);
});

test("a wrong key cannot edit a plot", async () => {
  const result = await store.updatePlot("B2", "definitely-not-the-key", { title: "Hijacked" });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, "forbidden");

  const untouched = await store.getPlot("B2");
  assert.notEqual(untouched?.title, "Hijacked");
});

test("founding plots have no key and cannot be edited", async () => {
  const seeded = (await store.listPlots()).find((plot) => plot.coord === "AF32");
  assert.ok(seeded, "the founding settlement should include AF32");

  const result = await store.updatePlot("AF32", "any-key-at-all", { title: "Taken over" });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, "immutable");
});

test("editing an unclaimed address reports not-found", async () => {
  const result = await store.updatePlot("Z60", "some-key", { title: "Ghost" });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, "not-found");
});

test("the owner can release a plot, and it becomes free again", async () => {
  const claim = await store.claimPlot({ ...CLAIM, coord: "S20" });
  assert.ok(claim.ok);
  if (!claim.ok) return;

  const released = await store.releasePlot("S20", claim.claimKey);
  assert.equal(released.ok, true);
  assert.equal(await store.getPlot("S20"), null);

  const reclaimed = await store.claimPlot({ ...CLAIM, coord: "S20", handle: "newcomer" });
  assert.equal(reclaimed.ok, true, "a released address goes back into the pool");
});

test("a wrong key cannot release a plot", async () => {
  const claim = await store.claimPlot({ ...CLAIM, coord: "S21" });
  assert.ok(claim.ok);
  if (!claim.ok) return;

  const result = await store.releasePlot("S21", "wrong");
  assert.equal(result.ok, false);
  assert.ok(await store.getPlot("S21"), "the plot is still held");
});

test("a released plot is gone from disk, not just from memory", async () => {
  const claim = await store.claimPlot({ ...CLAIM, coord: "P16" });
  assert.ok(claim.ok);
  if (!claim.ok) return;

  await store.releasePlot("P16", claim.claimKey);
  const file = await readRegister();
  assert.equal(
    file.plots.some((entry) => entry.coord === "P16"),
    false,
  );
});

test("ownership still works after the cache is dropped", async () => {
  const claim = await store.claimPlot({ ...CLAIM, coord: "Q17" });
  assert.ok(claim.ok);
  if (!claim.ok) return;

  store.resetCacheForTests();
  const result = await store.updatePlot("Q17", claim.claimKey, { title: "Still mine" });
  assert.equal(result.ok, true, "the key must keep working across a restart");
});

test("addresses are matched case-insensitively", async () => {
  assert.ok(await store.getPlot("b2"));
  assert.ok(await store.getPlot("  B2  "));
});

/**
 * The cache is not private to one copy of this module: Next bundles route
 * handlers separately from page renderers, so a single server holds several,
 * and a multi-process deployment holds more. A reader that trusts its own
 * memory forever will serve a plot as unclaimed after somebody else claims it.
 */
test("a claim written by another process is visible without a restart", async () => {
  await store.listPlots(); // warm this copy's cache first

  const file = await readRegister();
  file.plots.push({
    coord: "T22",
    title: "Written by someone else",
    handle: "otherprocess",
    url: null,
    bio: null,
    color: "slate",
    glyph: "●",
    claimedAt: new Date().toISOString(),
    updatedAt: null,
    keyHash: null,
  });
  await writeFile(path.join(dataDir, "plots.json"), JSON.stringify(file, null, 2), "utf8");

  const plot = await store.getPlot("T22");
  assert.ok(plot, "a write from another process must be picked up on the next read");
  assert.equal(plot?.title, "Written by someone else");
});

test("an address taken by another process can no longer be claimed here", async () => {
  const file = await readRegister();
  file.plots.push({
    coord: "T23",
    title: "Also written elsewhere",
    handle: "otherprocess",
    url: null,
    bio: null,
    color: "slate",
    glyph: "●",
    claimedAt: new Date().toISOString(),
    updatedAt: null,
    keyHash: null,
  });
  await writeFile(path.join(dataDir, "plots.json"), JSON.stringify(file, null, 2), "utf8");

  const result = await store.claimPlot({ ...CLAIM, coord: "T23" });
  assert.equal(result.ok, false, "we must not hand out an address someone else already took");
});
