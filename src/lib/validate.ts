import { parseCoord } from "./land";
import { isColorKey, isGlyph } from "./palette";
import type { ClaimInput, FieldErrors } from "./types";

export const LIMITS = {
  title: 40,
  handle: 24,
  url: 200,
  bio: 180,
} as const;

/** Handles that would let a plot impersonate the site itself. */
const RESERVED_HANDLES = new Set([
  "llnad",
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

  const title = clean(asString(input.title));
  if (!title) {
    errors.title = "Give your plot a name.";
  } else if (title.length > LIMITS.title) {
    errors.title = `Keep it under ${LIMITS.title} characters.`;
  }

  const handle = clean(asString(input.handle)).replace(/^@+/, "").toLowerCase();
  if (!handle) {
    errors.handle = "A settler needs a handle.";
  } else if (handle.length < 2 || handle.length > LIMITS.handle) {
    errors.handle = `Use 2 to ${LIMITS.handle} characters.`;
  } else if (!HANDLE_PATTERN.test(handle)) {
    errors.handle = "Letters, numbers, dashes and underscores only.";
  } else if (RESERVED_HANDLES.has(handle)) {
    errors.handle = "That handle is reserved.";
  }

  const rawUrl = clean(asString(input.url));
  let url: string | null = null;
  if (rawUrl) {
    if (rawUrl.length > LIMITS.url) {
      errors.url = `Keep it under ${LIMITS.url} characters.`;
    } else {
      const candidate = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
      try {
        const parsed = new URL(candidate);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          errors.url = "Only http and https links are allowed.";
        } else if (!parsed.hostname.includes(".")) {
          errors.url = "That does not look like a real address.";
        } else {
          url = parsed.toString();
        }
      } catch {
        errors.url = "That does not look like a real address.";
      }
    }
  }

  const bio = clean(asString(input.bio));
  if (bio.length > LIMITS.bio) {
    errors.bio = `Keep it under ${LIMITS.bio} characters.`;
  }

  const color = asString(input.color);
  if (!isColorKey(color)) {
    errors.color = "Pick one of the available colours.";
  }

  const glyph = asString(input.glyph);
  if (!isGlyph(glyph)) {
    errors.glyph = "Pick one of the available marks.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    errors: {},
    value: { coord, title, handle, url, bio: bio || null, color, glyph },
  };
}
