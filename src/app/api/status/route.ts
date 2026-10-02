import { NextResponse } from "next/server";

import { summonedClones } from "@/lib/clone-store";
import { mindMode } from "@/lib/claude-mind";
import { getMarketSnapshot } from "@/lib/market";

export const dynamic = "force-dynamic";

/** Health readout: what is live, what is configured, nothing invented. */
export async function GET() {
  const snapshot = await getMarketSnapshot();
  return NextResponse.json({
    app: "CLONE",
    sources: {
      market: {
        source: snapshot.source,
        status: snapshot.status,
        ...(snapshot.error ? { error: snapshot.error } : {}),
      },
      mind:
        mindMode() === "claude"
          ? { mode: "claude", note: "lines written by Claude, grounded in live fields" }
          : {
              mode: "rules",
              note: "deterministic line bank; set ANTHROPIC_API_KEY for Claude minds",
              missingEnv: ["ANTHROPIC_API_KEY"],
            },
    },
    summoned: summonedClones().length,
    at: new Date().toISOString(),
  });
}
