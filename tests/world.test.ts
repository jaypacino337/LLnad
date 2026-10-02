import assert from "node:assert/strict";
import test from "node:test";

import {
  ARCHETYPES,
  GRID_H,
  GRID_W,
  PLACES,
  SLEEP_PLACE,
  SLOT_MS,
  SPRITE_H,
  SPRITE_W,
  energyFrom,
  hash32,
  isAwake,
  moodFrom,
  personaFor,
  placeById,
  placeForSlot,
  poseAt,
  spriteCells,
  unit,
} from "../src/lib/world.ts";

const MINTS = [
  "6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN",
  "So11111111111111111111111111111111111111112",
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
];

test("hash32 and unit are deterministic and well-ranged", () => {
  for (const mint of MINTS) {
    assert.equal(hash32(mint, 5), hash32(mint, 5));
    const value = unit(mint, 5);
    assert.ok(value >= 0 && value < 1);
  }
  assert.notEqual(hash32(MINTS[0], 1), hash32(MINTS[0], 2));
  assert.notEqual(hash32(MINTS[0], 1), hash32(MINTS[1], 1));
});

test("persona derives stably from the mint", () => {
  for (const mint of MINTS) {
    const a = personaFor(mint);
    const b = personaFor(mint);
    assert.deepEqual(a, b);
    assert.ok(ARCHETYPES.includes(a.archetype));
    assert.match(a.color, /^#[0-9a-f]{6}$/);
    assert.ok(PLACES.some((place) => place.id === a.favorite));
  }
});

test("sprites are deterministic, mirrored, right-sized, with eyes", () => {
  for (const mint of MINTS) {
    const cells = spriteCells(mint);
    assert.deepEqual(cells, spriteCells(mint));
    assert.equal(cells.length, SPRITE_H);
    for (const row of cells) assert.equal(row.length, SPRITE_W);
    // Mirror symmetry everywhere except the fixed eye cells.
    for (let y = 0; y < SPRITE_H; y++) {
      for (let x = 0; x < SPRITE_W / 2; x++) {
        if (y === 2 || y === 3) continue;
        assert.equal(cells[y][x], cells[y][SPRITE_W - 1 - x], `${mint} ${x},${y}`);
      }
    }
    // Eye sockets: lit brow row, dark pupil row.
    assert.equal(cells[2][3], true);
    assert.equal(cells[2][6], true);
    assert.equal(cells[3][3], false);
    assert.equal(cells[3][6], false);
  }
  assert.notDeepEqual(spriteCells(MINTS[0]), spriteCells(MINTS[1]));
});

test("energy is a log reading of real 24h volume", () => {
  assert.equal(energyFrom(null), 0);
  assert.equal(energyFrom(0), 0);
  assert.equal(energyFrom(1_000_000), 1);
  const small = energyFrom(1_000);
  const large = energyFrom(100_000);
  assert.ok(small > 0 && small < large && large < 1);
});

test("awake means a real trade in the last hour", () => {
  const base = {
    priceUsd: 1,
    marketCap: 1,
    liquidityUsd: 1,
    volume1h: 0,
    volume24h: 100,
    change1h: 0,
    change24h: 0,
    buys1h: 0,
    sells1h: 0,
  };
  assert.equal(isAwake(base), false);
  assert.equal(isAwake({ ...base, volume1h: 12 }), true);
  assert.equal(isAwake({ ...base, sells1h: 1 }), true);
  assert.equal(isAwake({ ...base, volume1h: null, buys1h: null, sells1h: null }), false);
});

test("mood tracks the 1h change bands", () => {
  assert.equal(moodFrom(null), "flat");
  assert.equal(moodFrom(12), "euphoric");
  assert.equal(moodFrom(3), "up");
  assert.equal(moodFrom(0), "flat");
  assert.equal(moodFrom(-3), "down");
  assert.equal(moodFrom(-20), "wrecked");
});

test("sleeping clones are always in the cache", () => {
  for (const mint of MINTS) {
    for (let slot = 0; slot < 20; slot++) {
      assert.equal(placeForSlot(mint, slot, false), SLEEP_PLACE);
    }
    const pose = poseAt(mint, Date.UTC(2026, 9, 2, 12, 0, 0), false);
    assert.equal(pose.place, SLEEP_PLACE);
    const [x1, y1, x2, y2] = placeById(SLEEP_PLACE).rect;
    assert.ok(pose.x >= x1 && pose.x <= x2 + 1, `x ${pose.x}`);
    assert.ok(pose.y >= y1 && pose.y <= y2 + 1, `y ${pose.y}`);
  }
});

test("awake clones visit valid places and vary them over time", () => {
  const visited = new Set<string>();
  for (let slot = 0; slot < 40; slot++) {
    const id = placeForSlot(MINTS[0], slot, true);
    assert.ok(PLACES.some((place) => place.id === id));
    visited.add(id);
  }
  assert.ok(visited.size > 2, `only visited ${[...visited].join(", ")}`);
});

test("poses are deterministic, in-bounds, and continuous", () => {
  const start = Date.UTC(2026, 9, 2, 9, 30, 0);
  for (const mint of MINTS) {
    const a = poseAt(mint, start, true);
    const b = poseAt(mint, start, true);
    assert.deepEqual(a, b);

    // Sample a full slot densely: never out of the map, never teleporting.
    let previous = poseAt(mint, start, true);
    for (let t = 250; t <= SLOT_MS; t += 250) {
      const pose = poseAt(mint, start + t, true);
      assert.ok(pose.x >= 0 && pose.x <= GRID_W, `x ${pose.x}`);
      assert.ok(pose.y >= 0 && pose.y <= GRID_H, `y ${pose.y}`);
      const jump = Math.abs(pose.x - previous.x) + Math.abs(pose.y - previous.y);
      assert.ok(jump < 2.5, `jumped ${jump.toFixed(2)} cells in 250ms`);
      previous = pose;
    }
  }
});
