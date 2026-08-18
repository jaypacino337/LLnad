import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Pro token gating.
 *
 * A holder proves ownership by signing a short message with their wallet; the
 * server verifies the ed25519 signature, checks the wallet's PUMPXBT balance
 * over RPC, and issues an HMAC-signed session cookie. There is no
 * "pretend unlocked" path: without the mint configured, the section reports
 * itself unconfigured. The RPC defaults to Solana's public endpoint.
 */

/** Only the mint is required — the RPC defaults to Solana's public endpoint. */
export const PRO_ENV = ["PUMPXBT_TOKEN_MINT"] as const;

export const PRO_COOKIE = "pumpxbt_pro";
export const PRO_SESSION_HOURS = 24;
/** Signed verification messages are valid for this long. */
export const PRO_MESSAGE_WINDOW_MS = 10 * 60 * 1000;

export interface ProState {
  configured: boolean;
  unlocked: boolean;
  wallet: string | null;
  requirement: string;
  missingEnv: string[];
}

export function proMissingEnv(): string[] {
  return PRO_ENV.filter((key) => !process.env[key]);
}

/**
 * Session signing key: PRO_SESSION_SECRET when set, otherwise a per-process
 * random key — sessions then reset on restart, which is safe, just less
 * convenient. Never a hardcoded constant.
 */
const sessionKey: Buffer = process.env.PRO_SESSION_SECRET
  ? Buffer.from(process.env.PRO_SESSION_SECRET, "utf8")
  : randomBytes(32);

function hmac(payload: string): string {
  return createHmac("sha256", sessionKey).update(payload).digest("base64url");
}

/** Issues "wallet.expiresMs.signature". */
export function createProSession(wallet: string, now = Date.now()): string {
  const expires = now + PRO_SESSION_HOURS * 3_600_000;
  const payload = `${wallet}.${expires}`;
  return `${payload}.${hmac(payload)}`;
}

/** Returns the wallet for a valid, unexpired session token; null otherwise. */
export function verifyProSession(token: string | undefined, now = Date.now()): string | null {
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

/** The exact message a wallet must sign. Timestamp bounds replay. */
export function proMessage(wallet: string, timestampMs: number): string {
  return `PumpXBT Pro verification\nwallet: ${wallet}\nts: ${timestampMs}`;
}

export function getProState(sessionToken?: string): ProState {
  const missingEnv = proMissingEnv();
  const configured = missingEnv.length === 0;
  const wallet = configured ? verifyProSession(sessionToken) : null;

  return {
    configured,
    unlocked: wallet !== null,
    wallet,
    requirement: !configured
      ? `Gating is not configured. Set ${missingEnv.join(" and ")}.`
      : wallet
        ? `Verified holder ${wallet.slice(0, 4)}…${wallet.slice(-4)}.`
        : "Connect a wallet holding PUMPXBT to unlock.",
    missingEnv: [...missingEnv],
  };
}

export const PRO_FEATURES = [
  "Tracked smart wallets",
  "Full wallet cluster graph",
  "Advanced rule sets and custom thresholds",
  "Historical call performance",
  "Wallet alerts",
  "Custom watchlists",
] as const;
