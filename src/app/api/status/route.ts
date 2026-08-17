import { NextResponse } from "next/server";

import { isAutopostConfigured, missingAutopostEnv } from "@/lib/autopost";
import { getMarketSnapshot } from "@/lib/market";
import { proMissingEnv } from "@/lib/pro";
import { deriveSignals } from "@/lib/signals";
import { treasuryMissingEnv } from "@/lib/treasury";
import { walletMissingEnv } from "@/lib/wallets";

export const dynamic = "force-dynamic";

/** Health and configuration in one place — useful for uptime checks. */
export async function GET() {
  const snapshot = await getMarketSnapshot();
  const signals = deriveSignals(snapshot.tokens, 40);

  return NextResponse.json(
    {
      agent: snapshot.status === "live" ? "online" : "degraded",
      lastIndexedAt: snapshot.fetchedAt,
      marketsIndexed: snapshot.tokens.length,
      signals: signals.length,
      sources: {
        market: { provider: snapshot.source, live: snapshot.status === "live", error: snapshot.error },
        walletFlow: { configured: walletMissingEnv().length === 0, missingEnv: walletMissingEnv() },
        treasury: { configured: treasuryMissingEnv().length === 0, missingEnv: treasuryMissingEnv() },
        autopost: { configured: isAutopostConfigured(), missingEnv: missingAutopostEnv() },
        pro: { configured: proMissingEnv().length === 0, missingEnv: proMissingEnv() },
        calls: { publishing: Boolean(process.env.ADMIN_SECRET) },
      },
    },
    { headers: { "cache-control": "no-store" } },
  );
}
