import { NextResponse } from "next/server";

import { storeKind, summonedClones } from "@/lib/clone-store";
import { tokenConfig } from "@/lib/seats/config";
import { mindMode } from "@/lib/claude-mind";
import { getMarketSnapshot } from "@/lib/market";

export const dynamic = "force-dynamic";

/** Health readout: what is live, what is configured, nothing invented. */
export async function GET() {
  const snapshot = await getMarketSnapshot();
  const token = tokenConfig();
  const store = storeKind();
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
      store:
        store === "supabase"
          ? { backend: "supabase", note: "durable across cold starts and instances" }
          : {
              backend: "file",
              note: "JSON on local disk; ephemeral on serverless hosts",
              missingEnv: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
            },
      seats: token.ok
        ? { open: true, mint: token.config.mint, rpc: process.env.SOLANA_RPC_URL ? "custom" : "public" }
        : { open: false, missingEnv: token.missing },
    },
    summoned: (await summonedClones()).length,
    at: new Date().toISOString(),
  });
}
