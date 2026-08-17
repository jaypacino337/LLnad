import { NextResponse } from "next/server";

import { isAutopostConfigured, missingAutopostEnv } from "@/lib/autopost";
import { getMarketSnapshot } from "@/lib/market";
import { getProState } from "@/lib/pro";
import { deriveSignals } from "@/lib/signals";
import { treasuryState, walletFlowState } from "@/lib/sources";

export const dynamic = "force-dynamic";

/** Health and configuration in one place — useful for uptime checks. */
export async function GET() {
  const snapshot = await getMarketSnapshot();
  const signals = deriveSignals(snapshot.tokens, 40);
  const wallets = walletFlowState();
  const treasury = treasuryState();
  const pro = getProState();

  return NextResponse.json(
    {
      agent: snapshot.status === "live" ? "online" : "degraded",
      lastIndexedAt: snapshot.fetchedAt,
      marketsIndexed: snapshot.tokens.length,
      signals: signals.length,
      sources: {
        market: { provider: snapshot.source, live: snapshot.status === "live", error: snapshot.error },
        walletFlow: { live: wallets.configured, missingEnv: wallets.missingEnv },
        treasury: { live: treasury.configured, missingEnv: treasury.missingEnv },
        autopost: { live: isAutopostConfigured(), missingEnv: missingAutopostEnv() },
        pro: { configured: pro.configured, missingEnv: pro.missingEnv },
      },
    },
    { headers: { "cache-control": "no-store" } },
  );
}
