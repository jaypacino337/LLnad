import { NextResponse } from "next/server";

import { getMarketSnapshot, trending } from "@/lib/market";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await getMarketSnapshot();

  return NextResponse.json(
    {
      status: snapshot.status,
      source: snapshot.source,
      fetchedAt: snapshot.fetchedAt,
      count: snapshot.tokens.length,
      error: snapshot.error,
      trending: trending(snapshot.tokens, 8).map((token) => token.symbol),
      tokens: snapshot.tokens,
    },
    {
      // 503 when the upstream is down, so a monitor sees the real state.
      status: snapshot.status === "live" ? 200 : 503,
      headers: { "cache-control": "no-store" },
    },
  );
}
