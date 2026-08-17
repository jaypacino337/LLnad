import { NextResponse } from "next/server";

import { runAutopost } from "@/lib/autopost";
import { getMarketSnapshot } from "@/lib/market";
import { deriveSignals } from "@/lib/signals";

export const dynamic = "force-dynamic";

/**
 * Cron entry point for X autoposting.
 *
 * Guarded by CRON_SECRET when set — Vercel Cron sends it as a bearer token. If
 * the secret is unset the route still runs, so a schedule can be validated
 * before credentials exist, but nothing is ever sent without full X credentials.
 */
function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function handle(request: Request) {
  if (!authorised(request)) {
    return NextResponse.json(
      { error: "unauthorized", detail: "CRON_SECRET is set; send it as a bearer token." },
      { status: 401, headers: { "cache-control": "no-store" } },
    );
  }

  const snapshot = await getMarketSnapshot();

  if (snapshot.status !== "live") {
    // Never post from a snapshot we could not fetch.
    return NextResponse.json(
      {
        outcome: "skipped",
        detail: `Market source unavailable (${snapshot.error ?? "unknown"}); nothing composed.`,
      },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }

  const result = await runAutopost(deriveSignals(snapshot.tokens, 40));

  return NextResponse.json(result, {
    status: result.outcome === "error" ? 502 : 200,
    headers: { "cache-control": "no-store" },
  });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
