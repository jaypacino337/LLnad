import assert from "node:assert/strict";
import test from "node:test";

import { LIMITS, validateClaim, validatePatch } from "../src/lib/validate.ts";

const VALID = {
  coord: "C7",
  title: "The Forge",
  handle: "tulla",
  url: "example.com/tools",
  bio: "Small tools, sharpened weekly.",
  color: "moss",
  glyph: "✦",
};

test("a well-formed claim passes and is normalised", () => {
  const result = validateClaim(VALID);
  assert.equal(result.ok, true);
  assert.equal(result.value?.coord, "C7");
  assert.equal(result.value?.url, "https://example.com/tools", "a bare host gains https");
});

test("addresses are upper-cased", () => {
  const result = validateClaim({ ...VALID, coord: "af32" });
  assert.equal(result.value?.coord, "AF32");
});

test("handles are lower-cased and lose a leading at-sign", () => {
  const result = validateClaim({ ...VALID, handle: "@Tulla" });
  assert.equal(result.value?.handle, "tulla");
});

test("an off-map address is refused", () => {
  const result = validateClaim({ ...VALID, coord: "ZZ99" });
  assert.equal(result.ok, false);
  assert.ok(result.errors.coord);
});

test("a missing title is refused", () => {
  const result = validateClaim({ ...VALID, title: "   " });
  assert.equal(result.ok, false);
  assert.ok(result.errors.title);
});

test("over-long fields are refused", () => {
  const long = validateClaim({ ...VALID, title: "x".repeat(LIMITS.title + 1) });
  assert.equal(long.ok, false);
  assert.ok(long.errors.title);

  const bio = validateClaim({ ...VALID, bio: "x".repeat(LIMITS.bio + 1) });
  assert.equal(bio.ok, false);
  assert.ok(bio.errors.bio);
});

test("handles are restricted to a safe alphabet and length", () => {
  for (const handle of ["a", "x".repeat(LIMITS.handle + 1), "has space", "bad!", "-lead", "trail-"]) {
    const result = validateClaim({ ...VALID, handle });
    assert.equal(result.ok, false, `expected ${JSON.stringify(handle)} to be refused`);
    assert.ok(result.errors.handle);
  }
});

test("handles that impersonate the site are reserved", () => {
  for (const handle of ["solanda", "admin", "ROOT", "@Support"]) {
    const result = validateClaim({ ...VALID, handle });
    assert.equal(result.ok, false, `expected ${handle} to be reserved`);
  }
});

test("only http and https links are accepted", () => {
  for (const url of ["javascript:alert(1)", "data:text/html,hi", "ftp://example.com", "not a url"]) {
    const result = validateClaim({ ...VALID, url });
    assert.equal(result.ok, false, `expected ${url} to be refused`);
    assert.ok(result.errors.url);
  }
});

test("an explicit http link is left on http", () => {
  const result = validateClaim({ ...VALID, url: "http://example.com/" });
  assert.equal(result.value?.url, "http://example.com/");
});

test("no link at all is fine", () => {
  const result = validateClaim({ ...VALID, url: "", bio: "" });
  assert.equal(result.ok, true);
  assert.equal(result.value?.url, null);
  assert.equal(result.value?.bio, null);
});

test("colours and glyphs must come from the curated sets", () => {
  assert.equal(validateClaim({ ...VALID, color: "neon" }).ok, false);
  assert.equal(validateClaim({ ...VALID, glyph: "X" }).ok, false);
  assert.equal(validateClaim({ ...VALID, glyph: "<script>" }).ok, false);
});

test("invisible characters cannot be used to disguise a title", () => {
  // Zero-width space, zero-width joiner and a right-to-left override.
  const sneaky = `A${String.fromCodePoint(0x200b)}B${String.fromCodePoint(0x200d)}C${String.fromCodePoint(0x202e)}`;
  const result = validateClaim({ ...VALID, title: sneaky });
  assert.equal(result.ok, true);
  assert.equal(result.value?.title, "A B C", "invisibles become spaces, then collapse");
});

test("control characters are stripped rather than stored", () => {
  const tab = String.fromCodePoint(0x09);
  const newline = String.fromCodePoint(0x0a);
  const result = validateClaim({ ...VALID, title: `Line${tab}one${newline}two` });
  assert.equal(result.value?.title, "Line one two");
});

test("runs of whitespace collapse", () => {
  const result = validateClaim({ ...VALID, title: "  The    Forge  " });
  assert.equal(result.value?.title, "The Forge");
});

test("non-object and missing bodies are refused rather than throwing", () => {
  for (const body of [null, undefined, "string", 42, []]) {
    const result = validateClaim(body);
    assert.equal(result.ok, false);
  }
});

test("wrongly typed fields are treated as empty, not coerced", () => {
  const result = validateClaim({ ...VALID, title: { toString: () => "sneaky" } });
  assert.equal(result.ok, false);
  assert.ok(result.errors.title);
});

// --- Patches ---------------------------------------------------------------

test("a patch validates only the fields it carries", () => {
  const result = validatePatch({ title: "New Name" });
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, { title: "New Name" });
});

test("a patch can clear the link and the bio", () => {
  const result = validatePatch({ url: "", bio: "" });
  assert.equal(result.ok, true);
  assert.equal(result.value?.url, null);
  assert.equal(result.value?.bio, null);
});

test("an empty patch is refused", () => {
  assert.equal(validatePatch({}).ok, false);
  assert.equal(validatePatch(null).ok, false);
});

test("a patch cannot change the address or the handle", () => {
  const result = validatePatch({ coord: "A1", handle: "someone-else", title: "Fine" });
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, { title: "Fine" }, "only editable fields survive");
});

test("a patch applies the same field rules as a claim", () => {
  assert.equal(validatePatch({ title: "x".repeat(LIMITS.title + 1) }).ok, false);
  assert.equal(validatePatch({ url: "javascript:alert(1)" }).ok, false);
  assert.equal(validatePatch({ color: "neon" }).ok, false);
  assert.equal(validatePatch({ glyph: "X" }).ok, false);
});
