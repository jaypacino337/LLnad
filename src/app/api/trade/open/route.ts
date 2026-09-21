import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { accountView, pricesForGame } from "@/lib/game-api";
import { openPosition } from "@/lib/game-store";
import { SESSION_COOKIE, verifySession } from "@/lib/player";
import type { Side } from "@/lib/game";

export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "no-store" } as const;

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const wallet = verifySession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!wallet) {
    return NextResponse.json(
      { error: "not_signed_in", detail: "connect a wallet to trade" },
      { status: 401, headers: NO_STORE },
    );
  }

  let body: {
    tokenAddress?: string;
    symbol?: string;
    side?: Side;
    marginUsd?: number;
    leverage?: number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: NO_STORE });
  }

  const tokenAddress = body.tokenAddress?.trim();
  if (!tokenAddress || tokenAddress.length < 30 || tokenAddress.length > 50) {
    return NextResponse.json(
      { error: "invalid_token", detail: "tokenAddress must be a Solana mint address" },
      { status: 400, headers: NO_STORE },
    );
  }

  // Prices for everything held plus the token being opened — one upstream call.
  const prices = await pricesForGame([tokenAddress]);

  const result = await openPosition(
    wallet,
    {
      tokenAddress,
      symbol: body.symbol ?? "?",
      side: body.side as Side,
      marginUsd: Number(body.marginUsd),
      leverage: Number(body.leverage),
    },
    prices,
  );

  if (!result.ok) {
    // A missing live price is an upstream condition, not a client mistake.
    const status = result.error.includes("no live price") ? 503 : 400;
    return NextResponse.json({ error: "rejected", detail: result.error }, { status, headers: NO_STORE });
  }

  return NextResponse.json(
    { position: result.position, account: accountView(result.account, prices) },
    { status: 201, headers: NO_STORE },
  );
}
