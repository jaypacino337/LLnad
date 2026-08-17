import { NextResponse } from "next/server";

import { getMarketSnapshot } from "@/lib/market";
import { deriveSignals, strengthLabel } from "@/lib/signals";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await getMarketSnapshot();
  const signals = deriveSignals(snapshot.tokens, 40);

  return NextResponse.json(
    {
      status: snapshot.status,
      // Stated plainly in the payload so downstream consumers cannot mistake
      // these for model output.
      kind: "deterministic-rules",
      fetchedAt: snapshot.fetchedAt,
      count: signals.length,
      error: snapshot.error,
      signals: signals.map((signal) => ({ ...signal, strengthLabel: strengthLabel(signal.strength) })),
    },
    {
      status: snapshot.status === "live" ? 200 : 503,
      headers: { "cache-control": "no-store" },
    },
  );
}
