// Ported from memcoinz `.claude/skills/seats/scripts/seats-core.test.ts`: the
// seat rules must behave exactly as in the shared toolkit.
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import {
  SeatError, base58, base58Decode, batchMessage, claimCode, claimWithPost, fetchPost, isWallet, newCoin,
  postIdFromUrl, postMatches, postTime, scheduleBatch, seatLabel, seatPhrase, sweep, verifyWalletSignature, type VerifiedPost,
} from "../src/lib/seats/core.ts";

const HANDLE = "guestlistfun";
const W = (n: number) => base58(Uint8Array.from({ length: 32 }, (_, i) => (i * 7 + n * 13 + 1) % 256));
const MINT = W(99);
const T0 = 1_791_000_000_000;

function post(wallet: string, x: string, id: bigint, opts: { mint?: string; text?: string } = {}): VerifiedPost {
  const code = claimCode(opts.mint ?? MINT, wallet);
  const pid = (((BigInt(T0) + id * 1000n - 1288834974657n) << 22n) | 1n).toString();
  return { id: pid, handle: x, text: opts.text ?? `${seatPhrase(HANDLE, "SKY", code)} lets go`, postedAt: postTime(pid) };
}
const coin = (cap = 3) => newCoin({ mint: MINT, creator: W(0), name: "Sky", symbol: "SKY", image: null, seatCap: cap, minHold: 250_000 }, T0);
const code = (fn: () => unknown) => { try { fn(); } catch (e) { return (e as SeatError).code; } return "OK"; };

test("base58 round-trips and wallets validate", () => {
  for (const n of [1, 2, 3]) assert.equal(base58(base58Decode(W(n))), W(n));
  assert.ok(isWallet(W(1)));
  assert.ok(!isWallet("notawallet"));
  assert.equal(claimCode(MINT, W(1)).length, 8);
  assert.notEqual(claimCode(MINT, W(1)), claimCode(MINT, W(2)));
});

test("seat labels and snowflake times", () => {
  assert.deepEqual([0, 1, 5, 6, 83].map(seatLabel), ["1A", "1B", "1F", "2A", "14F"]);
  assert.equal(postTime("20"), 1288834974657);
  assert.equal(postIdFromUrl("https://x.com/jack/status/1791127100123456789?s=20"), "1791127100123456789");
  assert.equal(code(() => postIdFromUrl("https://example.com/x")), "BAD_POST_URL");
});

test("phrase matching is forgiving on spacing/case but strict on the code", () => {
  const c = claimCode(MINT, W(1));
  assert.ok(postMatches(`gm @GuestlistFun  $sky GIVE ME A SEAT • ${c}`, HANDLE, "SKY", c));
  assert.ok(!postMatches(`@guestlistfun $SKY give me a seat · ${c.toLowerCase()}x`, HANDLE, "SKY", c.slice(0, 7) + "Z"));
  assert.ok(!postMatches(`@guestlistfun $DOGE give me a seat · ${c}`, HANDLE, "SKY", c));
});

test("creator is seated; claims fill seats, then the waitlist in post order", () => {
  const k = coin(3);
  assert.equal(k.seats.length, 1);
  const r1 = claimWithPost(k, W(1), post(W(1), "ann", 10n), HANDLE, T0 + 20_000);
  assert.deepEqual(r1.status === "seated" && r1.label, "1B");
  claimWithPost(k, W(2), post(W(2), "bob", 11n), HANDLE, T0 + 21_000);
  // later post claimed first, earlier post claimed second: waitlist orders by post time
  const late = claimWithPost(k, W(4), post(W(4), "dan", 30n), HANDLE, T0 + 40_000);
  const early = claimWithPost(k, W(3), post(W(3), "cat", 12n), HANDLE, T0 + 41_000);
  assert.deepEqual([late, early].map((r) => r.status), ["waitlisted", "waitlisted"]);
  assert.deepEqual(k.waitlist.map((w) => w.x), ["cat", "dan"]);
});

test("one wallet, one 𝕏 account, one post: and nobody can use someone else's post", () => {
  const k = coin(10);
  claimWithPost(k, W(1), post(W(1), "ann", 10n), HANDLE, T0 + 20_000);
  assert.equal(code(() => claimWithPost(k, W(1), post(W(1), "ann2", 11n), HANDLE)), "WALLET_SEATED");
  assert.equal(code(() => claimWithPost(k, W(2), post(W(2), "ann", 12n), HANDLE)), "X_USED");
  // W(3) tries to use ann's post (code is for W(1)) → wrong phrase
  assert.equal(code(() => claimWithPost(k, W(3), post(W(1), "zed", 13n), HANDLE)), "WRONG_PHRASE");
  // post made for another coin
  assert.equal(code(() => claimWithPost(k, W(4), post(W(4), "eve", 14n, { mint: W(50) }), HANDLE)), "WRONG_PHRASE");
  // sold → lost the seat → can't come back with the same old post (needs a fresh one)
  const p = post(W(5), "fay", 15n);
  claimWithPost(k, W(5), p, HANDLE, T0 + 30_000);
  sweep(k, new Map([[W(5), 0]]), T0 + 40_000);
  assert.equal(code(() => claimWithPost(k, W(5), p, HANDLE, T0 + 50_000)), "POST_USED");
  assert.equal(claimWithPost(k, W(5), post(W(5), "fay", 16n), HANDLE, T0 + 60_000).status, "seated");
});

test("sell it, lose it: sweep frees low balances, keeps unknowns, promotes the waitlist", () => {
  const k = coin(2);
  claimWithPost(k, W(1), post(W(1), "ann", 10n), HANDLE, T0 + 20_000);
  claimWithPost(k, W(2), post(W(2), "bob", 11n), HANDLE, T0 + 21_000);
  const r = sweep(k, new Map([[W(0), 1_000_000], [W(1), 10]]), T0 + 60_000);
  assert.deepEqual(r.freed.map((s) => s.x), ["ann"]);
  assert.deepEqual(r.promoted.map((s) => s.x), ["bob"]);
  assert.equal(r.promoted[0].index, 1, "freed seat label is reused");
  assert.deepEqual(k.seats.map((s) => s.x).sort(), ["bob", "creator"]);
  // a failed balance read (wallet missing from the map) never frees a seat
  assert.equal(sweep(k, new Map(), T0 + 70_000).freed.length, 0);
});

test("batches open on time and absorb the waitlist", () => {
  const k = coin(1);
  claimWithPost(k, W(1), post(W(1), "ann", 10n), HANDLE, T0 + 20_000);
  claimWithPost(k, W(2), post(W(2), "bob", 11n), HANDLE, T0 + 21_000);
  scheduleBatch(k, 5, T0 + 3_600_000, T0 + 30_000);
  assert.equal(code(() => scheduleBatch(k, 5, T0 + 7_200_000, T0 + 30_000)), "BAD_BATCH");
  assert.equal(k.waitlist.length, 2);
  const r = sweep(k, new Map(), T0 + 3_600_001);
  assert.equal(k.seatCap, 6);
  assert.deepEqual(r.promoted.map((s) => s.x), ["ann", "bob"]);
});

test("creator batch auth: ed25519 signatures verify, tampering fails", () => {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const wallet = base58(Buffer.from(publicKey.export({ format: "jwk" }).x!, "base64url"));
  const msg = batchMessage(MINT, 200, T0);
  const sig = base58(sign(null, Buffer.from(msg), privateKey));
  assert.ok(verifyWalletSignature(wallet, msg, sig));
  assert.ok(!verifyWalletSignature(wallet, batchMessage(MINT, 2000, T0), sig));
  assert.ok(!verifyWalletSignature(W(1), msg, sig));
});

test("fetchPost parses 𝕏 oEmbed html", async () => {
  const c = claimCode(MINT, W(1));
  const fake = (async () =>
    new Response(JSON.stringify({
      author_url: "https://x.com/Ann",
      html: `<blockquote class="twitter-tweet"><p lang="en" dir="ltr"><a href="https://twitter.com/guestlistfun?ref_src=twsrc%5Etfw">@guestlistfun</a> <a href="https://twitter.com/search?q=%24SKY&amp;src=ctag">$SKY</a> give me a seat &middot; ${c}</p>&mdash; Ann (@Ann) <a href="https://x.com/Ann/status/1791127100123456789">Oct 4, 2026</a></blockquote>`,
    }))) as typeof fetch;
  const p = await fetchPost("https://x.com/Ann/status/1791127100123456789", fake);
  assert.equal(p.handle, "ann");
  assert.ok(postMatches(p.text, HANDLE, "SKY", c), p.text);
});
