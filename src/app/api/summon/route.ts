import { NextResponse } from "next/server";

import { summon } from "@/lib/clone-store";
import { lookupToken } from "@/lib/market";

export const dynamic = "force-dynamic";

/** Loose Solana address shape; real validation is the live-pair lookup. */
const MINT_SHAPE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/**
 * Summon a clone for a live token. Free, no wallet, no signature — the only
 * input is a public mint address. A token with no live Solana pair cannot be
 * summoned: a clone must have real readings to live on.
 */
export async function POST(request: Request) {
  let mint = "";
  try {
    const body = (await request.json()) as { mint?: unknown };
    mint = typeof body.mint === "string" ? body.mint.trim() : "";
  } catch {
    // Falls through to the shape check below.
  }

  if (!MINT_SHAPE.test(mint)) {
    return NextResponse.json(
      { detail: "That does not look like a Solana mint address." },
      { status: 400 },
    );
  }

  const token = await lookupToken(mint);
  if (!token) {
    return NextResponse.json(
      {
        detail:
          "No live Solana market found for that address. Clones need real trading data to live on — unlisted tokens cannot be summoned.",
      },
      { status: 404 },
    );
  }

  const result = await summon({
    mint: token.tokenAddress,
    symbol: token.symbol,
    name: token.name,
    dexId: token.dexId,
  });
  if (!result.ok) {
    return NextResponse.json(
      { detail: "The city is full. No new clones until someone moves out." },
      { status: 409 },
    );
  }

  return NextResponse.json(
    { clone: result.clone, already: result.already },
    { status: result.already ? 200 : 201 },
  );
}
