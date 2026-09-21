import { NextResponse } from "next/server";

import { isAutopostConfigured, missingAutopostEnv } from "@/lib/autopost";
import { accountCount } from "@/lib/game-store";
import { getMarketSnapshot } from "@/lib/market";
import { rewardGate } from "@/lib/player";
import { deriveSignals } from "@/lib/signals";

export const dynamic = "force-dynamic";

/** Health and configuration in one place — useful for uptime checks. */
export async function GET() {
  const snapshot = await getMarketSnapshot();
  const signals = deriveSignals(snapshot.tokens, 40);
  const gate = rewardGate();

  return NextResponse.json(
    {
      game: snapshot.status === "live" ? "trading" : "paused",
      lastIndexedAt: snapshot.fetchedAt,
      marketsIndexed: snapshot.tokens.length,
      signals: signals.length,
      players: await accountCount(),
      sources: {
        prices: { provider: snapshot.source, live: snapshot.status === "live", error: snapshot.error },
        rewardGate: {
          configured: gate.configured,
          minHold: gate.configured ? gate.minHold : null,
          symbol: gate.symbol,
          missingEnv: gate.configured ? [] : ["HOODST_TOKEN_MINT"],
        },
        autopost: { configured: isAutopostConfigured(), missingEnv: missingAutopostEnv() },
      },
    },
    { headers: { "cache-control": "no-store" } },
  );
}
