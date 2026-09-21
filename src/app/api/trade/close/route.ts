import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { accountView, pricesForGame } from "@/lib/game-api";
import { closePosition } from "@/lib/game-store";
import { SESSION_COOKIE, verifySession } from "@/lib/player";

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

  let body: { positionId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: NO_STORE });
  }
  if (!body.positionId) {
    return NextResponse.json(
      { error: "invalid_request", detail: "positionId is required" },
      { status: 400, headers: NO_STORE },
    );
  }

  const prices = await pricesForGame();
  const result = await closePosition(wallet, body.positionId, prices);

  if (!result.ok) {
    const status = result.error.includes("no live price") ? 503 : 400;
    return NextResponse.json({ error: "rejected", detail: result.error }, { status, headers: NO_STORE });
  }

  return NextResponse.json(
    { trade: result.trade, account: accountView(result.account, prices) },
    { headers: NO_STORE },
  );
}
