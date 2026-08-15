import assert from "node:assert/strict";
import test from "node:test";

import {
  GRID_COLS,
  GRID_ROWS,
  columnLabel,
  isInBounds,
  parseColumnLabel,
  parseCoord,
  regionName,
  toCoord,
} from "../src/lib/land.ts";

test("column labels count like spreadsheet columns", () => {
  assert.equal(columnLabel(0), "A");
  assert.equal(columnLabel(25), "Z");
  assert.equal(columnLabel(26), "AA");
  assert.equal(columnLabel(27), "AB");
  assert.equal(columnLabel(51), "AZ");
  assert.equal(columnLabel(52), "BA");
  assert.equal(columnLabel(GRID_COLS - 1), "BL");
});

test("every column label round-trips back to its index", () => {
  for (let col = 0; col < GRID_COLS; col += 1) {
    assert.equal(parseColumnLabel(columnLabel(col)), col, `column ${col}`);
  }
});

test("every address on the map round-trips", () => {
  for (let col = 0; col < GRID_COLS; col += 1) {
    for (let row = 0; row < GRID_ROWS; row += 1) {
      const parsed = parseCoord(toCoord(col, row));
      assert.deepEqual(parsed, { col, row }, `${col},${row}`);
    }
  }
});

test("addresses are read case-insensitively and ignore surrounding space", () => {
  assert.deepEqual(parseCoord("af32"), parseCoord("AF32"));
  assert.deepEqual(parseCoord("  AF32  "), parseCoord("AF32"));
});

test("rows are 1-indexed for humans but 0-indexed inside", () => {
  assert.deepEqual(parseCoord("A1"), { col: 0, row: 0 });
  assert.equal(toCoord(0, 0), "A1");
});

test("anything off the map is rejected", () => {
  const offMap = [
    "", // nothing
    "A0", // rows start at 1
    "A65", // one past the last row
    "BM1", // one past the last column
    "ZZ99", // far outside
    "1A", // back to front
    "A1B", // trailing junk
    "A 1", // internal space
    "AF32.5", // not an integer
    "-A1", // stray sign
  ];
  for (const coord of offMap) {
    assert.equal(parseCoord(coord), null, `expected ${JSON.stringify(coord)} to be off the map`);
  }
});

test("parseColumnLabel rejects non-letters", () => {
  assert.equal(parseColumnLabel("a"), null, "lowercase is normalised by the caller, not here");
  assert.equal(parseColumnLabel("A1"), null);
  assert.equal(parseColumnLabel(""), null);
});

test("bounds check refuses fractions and negatives", () => {
  assert.equal(isInBounds(0, 0), true);
  assert.equal(isInBounds(GRID_COLS - 1, GRID_ROWS - 1), true);
  assert.equal(isInBounds(-1, 0), false);
  assert.equal(isInBounds(0, GRID_ROWS), false);
  assert.equal(isInBounds(1.5, 0), false);
  assert.equal(isInBounds(Number.NaN, 0), false);
});

test("the middle ninth of the map is the Commons", () => {
  assert.equal(regionName(32, 32), "The Commons");
  assert.equal(regionName(0, 0), "North West");
  assert.equal(regionName(GRID_COLS - 1, GRID_ROWS - 1), "South East");
});

test("every square on the map gets a region name", () => {
  for (let col = 0; col < GRID_COLS; col += 1) {
    for (let row = 0; row < GRID_ROWS; row += 1) {
      assert.ok(regionName(col, row).length > 0);
    }
  }
});
