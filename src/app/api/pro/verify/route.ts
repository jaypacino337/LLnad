import { NextResponse } from "next/server";

import {
  PRO_COOKIE,
  PRO_MESSAGE_WINDOW_MS,
  PRO_SESSION_HOURS,
  createProSession,
  proMessage,
  proMissingEnv,
} from "@/lib/pro";
import { getTokenBalance, verifySolanaSignature } from "@/lib/solana";

export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "no-store" } as const;

/**
 * Holder verification:
 * 1. client signs proMessage(wallet, ts) with the wallet;
 * 2. server checks the ed25519 signature and that ts is recent;
 * 3. server reads the wallet's PUMPXBT balance over RPC;
 * 4. a positive balance earns an HttpOnly session cookie.
 */
export async function POST(request: Request) {
  const missingEnv = proMissingEnv();
  if (missingEnv.length > 0) {
    return NextResponse.json(
      { error: "not_configured", detail: `set ${missingEnv.join(" and ")}` },
      { status: 503, headers: NO_STORE },
    );
  }

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

  if (Math.abs(Date.now() - timestampMs) > PRO_MESSAGE_WINDOW_MS) {
    return NextResponse.json(
      { error: "stale_message", detail: "signature timestamp is outside the allowed window" },
      { status: 400, headers: NO_STORE },
    );
  }

  const message = new TextEncoder().encode(proMessage(wallet, timestampMs));
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

  let balance: number;
  try {
    balance = await getTokenBalance(process.env.SOLANA_RPC_URL!, wallet, process.env.PUMPXBT_TOKEN_MINT!);
  } catch (error) {
    return NextResponse.json(
      { error: "rpc_unavailable", detail: error instanceof Error ? error.message : "rpc failed" },
      { status: 503, headers: NO_STORE },
    );
  }

  if (balance <= 0) {
    return NextResponse.json(
      { error: "not_a_holder", detail: "this wallet holds no PUMPXBT" },
      { status: 403, headers: NO_STORE },
    );
  }

  const response = NextResponse.json({ unlocked: true, wallet, balance }, { headers: NO_STORE });
  response.cookies.set(PRO_COOKIE, createProSession(wallet), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: PRO_SESSION_HOURS * 3600,
    path: "/",
  });
  return response;
}
