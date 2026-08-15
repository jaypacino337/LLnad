import { parseCoord } from "./land";
import { isColorKey, isGlyph } from "./palette";
import type { ClaimInput, FieldErrors, PlotPatch } from "./types";

export const LIMITS = {
  title: 40,
  handle: 24,
  url: 200,
  bio: 180,
} as const;

/** Handles that would let a plot impersonate the site itself. */
const RESERVED_HANDLES = new Set([
  "solanda",
  "admin",
  "administrator",
  "root",
  "system",
  "support",
  "official",
  "moderator",
  "staff",
]);

const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/;

/**
 * Control, zero-width and bidi-override characters are all invisible once
 * rendered, which makes them useful for spoofing a title or handle. Compared
 * by code point so the source stays free of unreadable escape soup.
 */
function isInvisible(codePoint: number): boolean {
  if (codePoint < 0x20 || codePoint === 0x7f) return true;
  if (codePoint >= 0x80 && codePoint <= 0x9f) return true;
  if (codePoint >= 0x200b && codePoint <= 0x200f) return true;
  if (codePoint >= 0x202a && codePoint <= 0x202e) return true;
  if (codePoint >= 0x2066 && codePoint <= 0x2069) return true;
  return codePoint === 0x2060 || codePoint === 0xfeff;
}

/** Drop invisible characters, then collapse runs of whitespace. */
function clean(value: string): string {
  let out = "";
  for (const char of value) {
    out += isInvisible(char.codePointAt(0) ?? 0) ? " " : char;
  }
  return out.replace(/\s+/g, " ").trim();
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

// --- Per-field rules, shared by the claim and the patch --------------------

function checkTitle(raw: string): { value: string; error?: string } {
  const value = clean(raw);
  if (!value) return { value, error: "Give your plot a name." };
  if (value.length > LIMITS.title) {
    return { value, error: `Keep it under ${LIMITS.title} characters.` };
  }
  return { value };
}

function checkHandle(raw: string): { value: string; error?: string } {
  const value = clean(raw).replace(/^@+/, "").toLowerCase();
  if (!value) return { value, error: "A settler needs a handle." };
  if (value.length < 2 || value.length > LIMITS.handle) {
    return { value, error: `Use 2 to ${LIMITS.handle} characters.` };
  }
  if (!HANDLE_PATTERN.test(value)) {
    return { value, error: "Letters, numbers, dashes and underscores only." };
  }
  if (RESERVED_HANDLES.has(value)) return { value, error: "That handle is reserved." };
  return { value };
}

/** Empty input is a deliberate "no link", not an error. */
function checkUrl(raw: string): { value: string | null; error?: string } {
  const trimmed = clean(raw);
  if (!trimmed) return { value: null };
  if (trimmed.length > LIMITS.url) {
    return { value: null, error: `Keep it under ${LIMITS.url} characters.` };
  }

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { value: null, error: "Only http and https links are allowed." };
    }
    if (!parsed.hostname.includes(".")) {
      return { value: null, error: "That does not look like a real address." };
    }
    return { value: parsed.toString() };
  } catch {
    return { value: null, error: "That does not look like a real address." };
  }
}

function checkBio(raw: string): { value: string | null; error?: string } {
  const value = clean(raw);
  if (value.length > LIMITS.bio) {
    return { value: null, error: `Keep it under ${LIMITS.bio} characters.` };
  }
  return { value: value || null };
}

// --- Claims ----------------------------------------------------------------

export interface ValidationResult {
  ok: boolean;
  errors: FieldErrors;
  value?: ClaimInput;
}

export function validateClaim(body: unknown): ValidationResult {
  const errors: FieldErrors = {};
  const input = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;

  const coord = clean(asString(input.coord)).toUpperCase();
  if (!coord) {
    errors.coord = "Pick a plot on the map.";
  } else if (!parseCoord(coord)) {
    errors.coord = "That address is not on the land.";
  }

  const title = checkTitle(asString(input.title));
  if (title.error) errors.title = title.error;

  const handle = checkHandle(asString(input.handle));
  if (handle.error) errors.handle = handle.error;

  const url = checkUrl(asString(input.url));
  if (url.error) errors.url = url.error;

  const bio = checkBio(asString(input.bio));
  if (bio.error) errors.bio = bio.error;

  const color = asString(input.color);
  if (!isColorKey(color)) errors.color = "Pick one of the available colours.";

  const glyph = asString(input.glyph);
  if (!isGlyph(glyph)) errors.glyph = "Pick one of the available marks.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    errors: {},
    value: {
      coord,
      title: title.value,
      handle: handle.value,
      url: url.value,
      bio: bio.value,
      color,
      glyph,
    },
  };
}

// --- Edits -----------------------------------------------------------------

export interface PatchValidation {
  ok: boolean;
  errors: FieldErrors;
  value?: PlotPatch;
}

/**
 * Only the keys actually present are validated and returned, so a caller can
 * change one field without resending the rest. The address and the handle are
 * not editable — they are how the rest of the map refers to this plot.
 */
export function validatePatch(body: unknown): PatchValidation {
  const errors: FieldErrors = {};
  const input = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  const patch: PlotPatch = {};

  if (input.title !== undefined) {
    const title = checkTitle(asString(input.title));
    if (title.error) errors.title = title.error;
    else patch.title = title.value;
  }

  if (input.url !== undefined) {
    const url = checkUrl(asString(input.url));
    if (url.error) errors.url = url.error;
    else patch.url = url.value;
  }

  if (input.bio !== undefined) {
    const bio = checkBio(asString(input.bio));
    if (bio.error) errors.bio = bio.error;
    else patch.bio = bio.value;
  }

  if (input.color !== undefined) {
    const color = asString(input.color);
    if (!isColorKey(color)) errors.color = "Pick one of the available colours.";
    else patch.color = color;
  }

  if (input.glyph !== undefined) {
    const glyph = asString(input.glyph);
    if (!isGlyph(glyph)) errors.glyph = "Pick one of the available marks.";
    else patch.glyph = glyph;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  if (Object.keys(patch).length === 0) {
    return { ok: false, errors: { title: "There is nothing to change." } };
  }

  return { ok: true, errors: {}, value: patch };
}
