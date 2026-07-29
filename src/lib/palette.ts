export interface PlotColor {
  key: string;
  label: string;
  hex: string;
  /** Text colour that stays legible on top of `hex`. */
  ink: string;
}

export const PLOT_COLORS: PlotColor[] = [
  { key: "ember", label: "Ember", hex: "#e2703a", ink: "#20120b" },
  { key: "ochre", label: "Ochre", hex: "#d9a441", ink: "#211705" },
  { key: "moss", label: "Moss", hex: "#6f9c6a", ink: "#0d1a0d" },
  { key: "pine", label: "Pine", hex: "#3f7d6a", ink: "#f2fbf7" },
  { key: "slate", label: "Slate", hex: "#6b7f96", ink: "#f4f8fc" },
  { key: "indigo", label: "Indigo", hex: "#6a6ec2", ink: "#f5f5ff" },
  { key: "plum", label: "Plum", hex: "#a2648f", ink: "#fdf3fa" },
  { key: "clay", label: "Clay", hex: "#b56a5a", ink: "#fff4f1" },
];

export const DEFAULT_COLOR = PLOT_COLORS[0].key;

const COLOR_BY_KEY = new Map(PLOT_COLORS.map((color) => [color.key, color]));

export function getColor(key: string): PlotColor {
  return COLOR_BY_KEY.get(key) ?? PLOT_COLORS[0];
}

export function isColorKey(key: unknown): key is string {
  return typeof key === "string" && COLOR_BY_KEY.has(key);
}

/**
 * A curated glyph set. Restricting the choice keeps the map visually coherent
 * and sidesteps having to moderate arbitrary user-supplied characters.
 */
export const GLYPHS = [
  "▲",
  "▼",
  "●",
  "◆",
  "■",
  "✦",
  "✧",
  "❖",
  "⌂",
  "✿",
  "❀",
  "⚑",
  "◈",
  "◉",
  "✚",
  "➤",
  "♦",
  "☾",
  "☀",
  "✳",
  "⬢",
  "⬡",
  "⌘",
  "♞",
] as const;

export const DEFAULT_GLYPH = GLYPHS[0];

const GLYPH_SET = new Set<string>(GLYPHS);

export function isGlyph(value: unknown): value is string {
  return typeof value === "string" && GLYPH_SET.has(value);
}
