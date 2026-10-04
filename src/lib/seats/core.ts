/**
 * Ported from memcoinz `.claude/skills/launchpad-site/preset-seats/lib/seats-core.ts`
 * (branch claude/solana-skills). Keep the rules in sync with the source; the
 * only changes are `seatLabel`/`batchMessage` living in ./shared (browser-safe) and BigInt() calls in
 * place of bigint literals (this repo's tsconfig targets ES2017).
 *
 * Guest-list seat registry: pure logic, no framework imports. Shared by the
 * website (API routes) and the memcoinz CLI (/seats skill, unit tests).
 *
 * Model (option 1, "pump.fun + off-chain guest list"): anyone can buy on
 * pump.fun, but only SEATED wallets earn perks (airdrops, flywheel rewards).
 * - A seat is claimed by posting `@handle $TICKER give me a seat · <code>` on 𝕏.
 *   <code> is derived from (mint, wallet), so a post only works for the wallet
 *   it names: nobody can paste someone else's post to take their seat.
 * - One 𝕏 account = one seat, one wallet = one seat, per coin.
 * - Full? Claims join a waitlist, promoted in post order when seats free up.
 * - Hold it, keep it: a sweep frees seats whose wallet fell below the minimum.
 * - The creator can schedule extra batches ("200 more at 9pm").
 */
import { createHash, createPublicKey, verify as edVerify } from "node:crypto";

import { batchMessage, seatLabel } from "./shared";

export { batchMessage, seatLabel };

export interface Seat {
  wallet: string;
  /** lowercase 𝕏 handle, or "creator" for the creator's own seat */
  x: string;
  /** 0-based seat index → label via seatLabel() */
  index: number;
  postId: string | null;
  at: number;
}

export interface Waiting {
  wallet: string;
  x: string;
  postId: string;
  /** ms timestamp of the post (from the snowflake id): first come, first served */
  postedAt: number;
  at: number;
}

export interface SeatCoin {
  mint: string;
  creator: string;
  name: string;
  symbol: string;
  image: string | null;
  seatCap: number;
  /** whole tokens a wallet must hold to keep its seat */
  minHold: number;
  createdAt: number;
  pendingBatch: { count: number; openAt: number } | null;
  seats: Seat[];
  waitlist: Waiting[];
  /** post ids already used (claimed, waitlisted or freed): a post works once */
  usedPosts: string[];
  lastSweepAt: number;
  freedTotal: number;
}

export type SeatErrorCode =
  | "BAD_WALLET" | "BAD_POST_URL" | "POST_NOT_FOUND" | "WRONG_PHRASE" | "POST_TOO_OLD"
  | "WALLET_SEATED" | "X_USED" | "POST_USED" | "ALREADY_WAITING" | "BAD_BATCH" | "BAD_SIGNATURE" | "NOT_CREATOR";

export class SeatError extends Error {
  // Declared field rather than a constructor parameter property, so the
  // tests can run this file through Node's type stripping.
  readonly code: SeatErrorCode;
  constructor(code: SeatErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

// ── codes, phrases ───────────────────────────────────────────────────────────
const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function base58(bytes: Uint8Array): string {
  let n = BigInt("0x" + (Buffer.from(bytes).toString("hex") || "0"));
  let out = "";
  while (n > BigInt(0)) {
    out = B58[Number(n % BigInt(58))] + out;
    n /= BigInt(58);
  }
  for (const b of bytes) {
    if (b !== 0) break;
    out = "1" + out;
  }
  return out;
}

export function base58Decode(s: string): Uint8Array {
  let n = BigInt(0);
  for (const c of s) {
    const v = B58.indexOf(c);
    if (v < 0) throw new SeatError("BAD_WALLET", "Not a valid Solana address");
    n = n * BigInt(58) + BigInt(v);
  }
  let hex = n.toString(16);
  if (hex.length % 2) hex = "0" + hex;
  const body = n === BigInt(0) ? [] : [...Buffer.from(hex, "hex")];
  const zeros = s.match(/^1*/)![0].length;
  return Uint8Array.from([...Array(zeros).fill(0), ...body]);
}

export function isWallet(s: string): boolean {
  try {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s) && base58Decode(s).length === 32;
  } catch {
    return false;
  }
}

/** 8-char code binding a post to (mint, wallet). ~47 bits: not grindable. */
export function claimCode(mint: string, wallet: string): string {
  return base58(createHash("sha256").update(`seat:${mint}:${wallet}`).digest()).slice(0, 8);
}

export function seatPhrase(handle: string, ticker: string, code: string): string {
  return `@${handle} $${ticker} give me a seat · ${code}`;
}

// ── 𝕏 posts ─────────────────────────────────────────────────────────────────
const X_EPOCH = BigInt(1288834974657);

export function postIdFromUrl(url: string): string {
  const m = url.trim().match(/^https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/[A-Za-z0-9_]{1,15}\/status(?:es)?\/(\d{1,25})/);
  if (!m) throw new SeatError("BAD_POST_URL", "Paste the link to your post (x.com/you/status/…)");
  return m[1];
}

/** Snowflake ids encode the post time in ms. */
export const postTime = (id: string) => Number((BigInt(id) >> BigInt(22)) + X_EPOCH);

export interface VerifiedPost {
  id: string;
  handle: string;
  text: string;
  postedAt: number;
}

const decodeEntities = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&mdash;/g, "—").replace(/&middot;/g, "·").replace(/&nbsp;/g, " ");

/** Reads a public post via 𝕏's free oEmbed endpoint (no API key). */
export async function fetchPost(url: string, fetchImpl: typeof fetch = fetch): Promise<VerifiedPost> {
  const id = postIdFromUrl(url);
  const res = await fetchImpl(`https://publish.x.com/oembed?omit_script=true&url=${encodeURIComponent(`https://x.com/i/status/${id}`)}`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new SeatError("POST_NOT_FOUND", "Couldn't read that post. Is it public and not deleted?");
  const json = (await res.json()) as { author_url?: string; html?: string };
  const handle = (json.author_url ?? "").split("/").pop()?.toLowerCase() ?? "";
  const p = (json.html ?? "").match(/<p[^>]*>([\s\S]*?)<\/p>/);
  const text = decodeEntities((p?.[1] ?? "").replace(/<br\s*\/?>/g, " ").replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
  if (!handle || !text) throw new SeatError("POST_NOT_FOUND", "Couldn't read that post. Is it public and not deleted?");
  return { id, handle, text, postedAt: postTime(id) };
}

/** True when the post text contains the phrase (case/spacing/dot-insensitive). */
export function postMatches(text: string, handle: string, ticker: string, code: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[·•|,.:;!-]/g, " ").replace(/\s+/g, " ").trim();
  const t = norm(text);
  return t.includes(norm(`@${handle}`)) && t.includes(norm(`$${ticker}`)) && t.includes("give me a seat") && text.includes(code);
}

// ── registry operations (mutate the coin in place) ──────────────────────────
export function newCoin(c: Pick<SeatCoin, "mint" | "creator" | "name" | "symbol" | "image" | "seatCap" | "minHold">, now = Date.now()): SeatCoin {
  if (!Number.isInteger(c.seatCap) || c.seatCap < 1 || c.seatCap > 100_000) throw new SeatError("BAD_BATCH", "Seat cap must be 1-100000");
  return {
    ...c,
    createdAt: now,
    pendingBatch: null,
    // The creator gets a seat, like a dev buy on pump.fun.
    seats: [{ wallet: c.creator, x: "creator", index: 0, postId: null, at: now }],
    waitlist: [],
    usedPosts: [],
    lastSweepAt: 0,
    freedTotal: 0,
  };
}

const nextFreeIndex = (coin: SeatCoin) => {
  const used = new Set(coin.seats.map((s) => s.index));
  let i = 0;
  while (used.has(i)) i++;
  return i;
};

/** Opens a due batch and fills free seats from the waitlist (post order). */
export function settle(coin: SeatCoin, now = Date.now()): Seat[] {
  if (coin.pendingBatch && now >= coin.pendingBatch.openAt) {
    coin.seatCap += coin.pendingBatch.count;
    coin.pendingBatch = null;
  }
  coin.waitlist.sort((a, b) => a.postedAt - b.postedAt || a.at - b.at);
  const promoted: Seat[] = [];
  while (coin.seats.length < coin.seatCap && coin.waitlist.length) {
    const w = coin.waitlist.shift()!;
    const seat: Seat = { wallet: w.wallet, x: w.x, index: nextFreeIndex(coin), postId: w.postId, at: now };
    coin.seats.push(seat);
    promoted.push(seat);
  }
  return promoted;
}

export type ClaimResult = { status: "seated"; seat: Seat; label: string } | { status: "waitlisted"; position: number };

/** Claims a seat for `wallet` with an already-fetched post. Throws SeatError on any rule violation. */
export function claimWithPost(coin: SeatCoin, wallet: string, post: VerifiedPost, padHandle: string, now = Date.now()): ClaimResult {
  if (!isWallet(wallet)) throw new SeatError("BAD_WALLET", "Not a valid Solana address");
  settle(coin, now);
  const code = claimCode(coin.mint, wallet);
  if (!postMatches(post.text, padHandle, coin.symbol, code))
    throw new SeatError("WRONG_PHRASE", `Your post must say exactly: ${seatPhrase(padHandle, coin.symbol, code)}`);
  if (post.postedAt < coin.createdAt - 60_000) throw new SeatError("POST_TOO_OLD", "That post is older than the coin");
  if (coin.usedPosts.includes(post.id)) throw new SeatError("POST_USED", "That post was already used for a seat");
  if (coin.seats.some((s) => s.wallet === wallet)) throw new SeatError("WALLET_SEATED", "This wallet already has a seat");
  if (coin.seats.some((s) => s.x === post.handle)) throw new SeatError("X_USED", `@${post.handle} already has a seat on this coin`);
  if (coin.waitlist.some((w) => w.wallet === wallet || w.x === post.handle)) throw new SeatError("ALREADY_WAITING", "Already on the waitlist");

  coin.usedPosts.push(post.id);
  if (coin.seats.length < coin.seatCap) {
    const seat: Seat = { wallet, x: post.handle, index: nextFreeIndex(coin), postId: post.id, at: now };
    coin.seats.push(seat);
    return { status: "seated", seat, label: seatLabel(seat.index) };
  }
  coin.waitlist.push({ wallet, x: post.handle, postId: post.id, postedAt: post.postedAt, at: now });
  coin.waitlist.sort((a, b) => a.postedAt - b.postedAt || a.at - b.at);
  return { status: "waitlisted", position: coin.waitlist.findIndex((w) => w.wallet === wallet) + 1 };
}

/**
 * Hold it, keep it. `balances` maps wallet → whole tokens held (from chain).
 * Frees every seat below the minimum (the creator's included: they post like
 * everyone else after that), then promotes the waitlist. Wallets missing from
 * `balances` are treated as unknown and kept: never free a seat on a failed read.
 */
export function sweep(coin: SeatCoin, balances: Map<string, number>, now = Date.now()): { freed: Seat[]; promoted: Seat[] } {
  const freed = coin.seats.filter((s) => balances.has(s.wallet) && balances.get(s.wallet)! < coin.minHold);
  const freedSet = new Set(freed.map((s) => s.wallet));
  coin.seats = coin.seats.filter((s) => !freedSet.has(s.wallet));
  coin.freedTotal += freed.length;
  coin.lastSweepAt = now;
  return { freed, promoted: settle(coin, now) };
}

export function scheduleBatch(coin: SeatCoin, count: number, openAt: number, now = Date.now()): void {
  settle(coin, now);
  if (coin.pendingBatch) throw new SeatError("BAD_BATCH", "A batch is already scheduled");
  if (!Number.isInteger(count) || count < 1 || count > 10_000) throw new SeatError("BAD_BATCH", "Batch must be 1-10000 seats");
  if (!Number.isFinite(openAt) || openAt < now - 60_000 || openAt > now + 30 * 86_400_000) throw new SeatError("BAD_BATCH", "Open time must be within the next 30 days");
  coin.pendingBatch = { count, openAt };
  settle(coin, now);
}

// ── creator auth: ed25519 signMessage (Phantom) verified server-side ───────

export function verifyWalletSignature(wallet: string, message: string, signatureB58: string): boolean {
  try {
    const key = createPublicKey({ key: { kty: "OKP", crv: "Ed25519", x: Buffer.from(base58Decode(wallet)).toString("base64url") }, format: "jwk" });
    return edVerify(null, Buffer.from(message, "utf8"), key, Buffer.from(base58Decode(signatureB58)));
  } catch {
    return false;
  }
}

/** Public view: what the API returns (no internal bookkeeping). */
export function publicView(coin: SeatCoin, now = Date.now()) {
  return {
    mint: coin.mint,
    name: coin.name,
    symbol: coin.symbol,
    image: coin.image,
    creator: coin.creator,
    seatCap: coin.seatCap,
    seatsTaken: coin.seats.length,
    minHold: coin.minHold,
    pendingBatch: coin.pendingBatch,
    waitlist: coin.waitlist.length,
    freedTotal: coin.freedTotal,
    lastSweepAt: coin.lastSweepAt || null,
    seats: coin.seats
      .slice()
      .sort((a, b) => a.index - b.index)
      .map((s) => ({ label: seatLabel(s.index), index: s.index, wallet: s.wallet, x: s.x })),
    at: now,
  };
}

export type PublicSeats = ReturnType<typeof publicView>;
