import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { accountView, pricesForGame } from "@/lib/game-api";
import { getOrCreateAccount } from "@/lib/game-store";
import { SESSION_COOKIE, verifySession } from "@/lib/player";

export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "no-store" } as const;

/** The signed-in player's account, marked to live prices. */
export async function GET() {
  const cookieStore = await cookies();
  const wallet = verifySession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!wallet) {
    return NextResponse.json(
      { error: "not_signed_in", detail: "connect a wallet to play" },
      { status: 401, headers: NO_STORE },
    );
  }

  const prices = await pricesForGame();
  const account = await getOrCreateAccount(wallet, prices);
  return NextResponse.json({ account: accountView(account, prices) }, { headers: NO_STORE });
}
