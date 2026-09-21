import { NextResponse } from "next/server";

import { accountView, pricesForGame } from "@/lib/game-api";
import { getOrCreateAccount, recordHolding } from "@/lib/game-store";
import {
  MESSAGE_WINDOW_MS,
  SESSION_COOKIE,
  SESSION_HOURS,
  createSession,
  rewardGate,
  signInMessage,
} from "@/lib/player";
import { getTokenBalance, solanaRpcUrl, verifySolanaSignature } from "@/lib/solana";

export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "no-store" } as const;

/**
 * Wallet sign-in:
 * 1. client signs signInMessage(wallet, ts) with the wallet;
 * 2. server checks the ed25519 signature and that ts is recent;
 * 3. a session cookie is issued and the paper account created on first visit;
 * 4. best-effort reward-token balance check for eligibility badges.
 */
export async function POST(request: Request) {
  let body: { wallet?: string; timestampMs?: number; signatureBase64?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: NO_STORE });
  }

  const { wallet, timestampMs, signatureBase64 } = body;
  if (!wallet || !timestampMs || !signatureBase64) {
    return NextResponse.json(
      { error: "invalid_request", detail: "wallet, timestampMs and signatureBase64 are required" },
      { status: 400, headers: NO_STORE },
    );
  }

  if (Math.abs(Date.now() - timestampMs) > MESSAGE_WINDOW_MS) {
    return NextResponse.json(
      { error: "stale_message", detail: "signature timestamp is outside the allowed window" },
      { status: 400, headers: NO_STORE },
    );
  }

  const message = new TextEncoder().encode(signInMessage(wallet, timestampMs));
  let signature: Uint8Array;
  try {
    signature = Uint8Array.from(Buffer.from(signatureBase64, "base64"));
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400, headers: NO_STORE });
  }

  if (!verifySolanaSignature(message, signature, wallet)) {
    return NextResponse.json(
      { error: "invalid_signature", detail: "the signature does not match the wallet" },
      { status: 403, headers: NO_STORE },
    );
  }

  const prices = await pricesForGame();
  const account = await getOrCreateAccount(wallet, prices);

  // Eligibility is a badge, not a gate on playing — a failed RPC read only
  // means the badge stays stale.
  const gate = rewardGate();
  if (gate.configured && gate.mint) {
    try {
      const held = await getTokenBalance(solanaRpcUrl(), wallet, gate.mint);
      await recordHolding(wallet, held);
      account.held = { amount: held, checkedAt: new Date().toISOString() };
    } catch {
      // keep the previous value
    }
  }

  const response = NextResponse.json({ signedIn: true, account: accountView(account, prices) }, { headers: NO_STORE });
  response.cookies.set(SESSION_COOKIE, createSession(wallet), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_HOURS * 3600,
    path: "/",
  });
  return response;
}
