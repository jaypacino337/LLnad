import { NextResponse } from "next/server";

import { pricesForGame } from "@/lib/game-api";
import { leaderboard } from "@/lib/game-store";
import { isEligible, rewardGate } from "@/lib/player";
import type { Period } from "@/lib/game";

export const dynamic = "force-dynamic";

const PERIODS: Period[] = ["daily", "weekly", "monthly"];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const period = (url.searchParams.get("period") ?? "daily") as Period;
  if (!PERIODS.includes(period)) {
    return NextResponse.json(
      { error: "invalid_period", detail: `period must be one of ${PERIODS.join(", ")}` },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  const prices = await pricesForGame();
  const rows = await leaderboard(period, prices);
  const gate = rewardGate();

  return NextResponse.json(
    {
      period,
      count: rows.length,
      gate: { configured: gate.configured, minHold: gate.minHold, symbol: gate.symbol },
      rows: rows.map((row, index) => ({
        rank: index + 1,
        ...row,
        rewardEligible: isEligible(row.heldAmount),
      })),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
