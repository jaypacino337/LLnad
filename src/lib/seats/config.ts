/**
 * The $CLONE token, as this site knows it. Everything comes from host env so
 * nothing about the token is hard-coded before it exists:
 *
 *   CLONE_TOKEN_MINT      the mint, once launched (unset → seats are "not open")
 *   CLONE_TOKEN_CREATOR   the creator wallet (gets seat 1A; signs seat batches)
 *   CLONE_X_HANDLE        the 𝕏 account claim posts must @mention (no @)
 *   CLONE_SEAT_CAP        initial number of seats (creator batches add more)
 *   CLONE_SEAT_MIN_HOLD   whole tokens a wallet must hold to keep its seat
 *   CLONE_TOKEN_SYMBOL    ticker in claim phrases (default CLONE)
 *   CLONE_TOKEN_NAME      display name (default CLONE)
 *
 * Seat cap and minimum hold are product decisions, so there are no defaults:
 * until all five required values are set, the seats API answers "not open".
 */

import { isWallet } from "./core";

export interface TokenConfig {
  mint: string;
  creator: string;
  handle: string;
  seatCap: number;
  minHold: number;
  symbol: string;
  name: string;
}

export type TokenConfigResult = { ok: true; config: TokenConfig } | { ok: false; missing: string[] };

const HANDLE_SHAPE = /^[A-Za-z0-9_]{1,15}$/;

export function tokenConfig(env: NodeJS.ProcessEnv = process.env): TokenConfigResult {
  const missing: string[] = [];
  const mint = env.CLONE_TOKEN_MINT?.trim() ?? "";
  const creator = env.CLONE_TOKEN_CREATOR?.trim() ?? "";
  const handle = (env.CLONE_X_HANDLE?.trim() ?? "").replace(/^@/, "");
  const seatCap = Number(env.CLONE_SEAT_CAP);
  const minHold = Number(env.CLONE_SEAT_MIN_HOLD);

  if (!isWallet(mint)) missing.push("CLONE_TOKEN_MINT");
  if (!isWallet(creator)) missing.push("CLONE_TOKEN_CREATOR");
  if (!HANDLE_SHAPE.test(handle)) missing.push("CLONE_X_HANDLE");
  if (!Number.isInteger(seatCap) || seatCap < 1 || seatCap > 100_000) missing.push("CLONE_SEAT_CAP");
  if (!Number.isFinite(minHold) || minHold < 0 || env.CLONE_SEAT_MIN_HOLD === undefined) missing.push("CLONE_SEAT_MIN_HOLD");
  if (missing.length > 0) return { ok: false, missing };

  const symbol = (env.CLONE_TOKEN_SYMBOL?.trim() || "CLONE").replace(/^\$/, "");
  return {
    ok: true,
    config: { mint, creator, handle, seatCap, minHold, symbol, name: env.CLONE_TOKEN_NAME?.trim() || "CLONE" },
  };
}
