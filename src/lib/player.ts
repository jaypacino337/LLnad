import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Player identity: a Solana wallet. Signing in is signing a short timestamped
 * message with the wallet; the server verifies the ed25519 signature and
 * issues an HMAC-signed session cookie. No passwords, no email — and never a
 * private key: nothing in Hood ST takes one.
 */

export const SESSION_COOKIE = "hoodst_session";
export const SESSION_HOURS = 24 * 7;
/** Signed sign-in messages are valid for this long. */
export const MESSAGE_WINDOW_MS = 10 * 60 * 1000;

/**
 * Session signing key: HOODST_SESSION_SECRET when set, otherwise a
 * per-process random key — sessions then reset on restart, which is safe,
 * just less convenient. Never a hardcoded constant.
 */
const sessionKey: Buffer = process.env.HOODST_SESSION_SECRET
  ? Buffer.from(process.env.HOODST_SESSION_SECRET, "utf8")
  : randomBytes(32);

function hmac(payload: string): string {
  return createHmac("sha256", sessionKey).update(payload).digest("base64url");
}

/** Issues "wallet.expiresMs.signature". */
export function createSession(wallet: string, now = Date.now()): string {
  const expires = now + SESSION_HOURS * 3_600_000;
  const payload = `${wallet}.${expires}`;
  return `${payload}.${hmac(payload)}`;
}

/** The wallet for a valid, unexpired session token; null otherwise. */
export function verifySession(token: string | undefined, now = Date.now()): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [wallet, expiresRaw, signature] = parts;
  const expires = Number.parseInt(expiresRaw, 10);
  if (!Number.isFinite(expires) || expires < now) return null;

  const expected = Buffer.from(hmac(`${wallet}.${expires}`));
  const provided = Buffer.from(signature);
  if (expected.length !== provided.length) return null;
  return timingSafeEqual(expected, provided) ? wallet : null;
}

/** The exact message a wallet signs. Timestamp bounds replay. */
export function signInMessage(wallet: string, timestampMs: number): string {
  return `Hood ST sign-in\nwallet: ${wallet}\nts: ${timestampMs}`;
}

/* --- reward eligibility ------------------------------------------------------
   Competitions are open to everyone; REWARDS require holding the reward token.
   Both values are public configuration — a mint address and a threshold. */

export interface RewardGate {
  configured: boolean;
  mint: string | null;
  minHold: number;
  symbol: string;
}

export function rewardGate(): RewardGate {
  const mint = process.env.HOODST_TOKEN_MINT || null;
  const minHold = Number.parseFloat(process.env.HOODST_MIN_HOLD ?? "");
  return {
    configured: mint !== null,
    mint,
    minHold: Number.isFinite(minHold) && minHold > 0 ? minHold : 1,
    symbol: process.env.NEXT_PUBLIC_HOLD_SYMBOL || "$HOODST",
  };
}

export function isEligible(heldAmount: number | null): boolean {
  const gate = rewardGate();
  if (!gate.configured || heldAmount === null) return false;
  return heldAmount >= gate.minHold;
}
