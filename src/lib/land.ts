/**
 * Geometry of the land: a fixed grid of plots addressed like spreadsheet cells.
 * Columns run A, B, ... Z, AA, AB, ...; rows are 1-indexed.
 */

export const GRID_COLS = 64;
export const GRID_ROWS = 64;
export const TOTAL_PLOTS = GRID_COLS * GRID_ROWS;

/** Base size of one plot, in CSS pixels, at zoom level 1. */
export const CELL_SIZE = 26;

export function columnLabel(col: number): string {
  let label = "";
  let n = col;
  while (n >= 0) {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  }
  return label;
}

export function parseColumnLabel(label: string): number | null {
  if (!/^[A-Z]+$/.test(label)) return null;
  let col = 0;
  for (const char of label) {
    col = col * 26 + (char.charCodeAt(0) - 64);
  }
  return col - 1;
}

export function isInBounds(col: number, row: number): boolean {
  return (
    Number.isInteger(col) &&
    Number.isInteger(row) &&
    col >= 0 &&
    row >= 0 &&
    col < GRID_COLS &&
    row < GRID_ROWS
  );
}

export function toCoord(col: number, row: number): string {
  return `${columnLabel(col)}${row + 1}`;
}

export function parseCoord(coord: string): { col: number; row: number } | null {
  const match = /^([A-Za-z]+)(\d{1,3})$/.exec(coord.trim());
  if (!match) return null;
  const col = parseColumnLabel(match[1].toUpperCase());
  const row = Number.parseInt(match[2], 10) - 1;
  if (col === null || !isInBounds(col, row)) return null;
  return { col, row };
}

/** Human label for a region of the map, used for flavour in the UI. */
export function regionName(col: number, row: number): string {
  const northSouth = row < GRID_ROWS / 3 ? "North" : row < (GRID_ROWS * 2) / 3 ? "Middle" : "South";
  const eastWest = col < GRID_COLS / 3 ? "West" : col < (GRID_COLS * 2) / 3 ? "Central" : "East";
  if (northSouth === "Middle" && eastWest === "Central") return "The Commons";
  return `${northSouth} ${eastWest}`;
}
