import { NextResponse } from "next/server";

import { checkClaimRate, clientKey } from "@/lib/rate-limit";
import { claimPlot, getStats, listPlots } from "@/lib/store";
import { validateClaim } from "@/lib/validate";

export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "no-store" } as const;

export async function GET() {
  const [plots, stats] = await Promise.all([listPlots(), getStats()]);
  return NextResponse.json({ stats, plots }, { headers: NO_STORE });
}

export async function POST(request: Request) {
  const limit = checkClaimRate(clientKey(request.headers));
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: "too_many_claims",
        message: "You have staked plenty for now. Try again a little later.",
      },
      {
        status: 429,
        headers: { ...NO_STORE, "retry-after": String(limit.retryAfterSeconds) },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "The request body was not valid JSON." },
      { status: 400, headers: NO_STORE },
    );
  }

  const validation = validateClaim(body);
  if (!validation.ok || !validation.value) {
    return NextResponse.json(
      { error: "invalid_claim", message: "Some details need fixing.", fields: validation.errors },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    const result = await claimPlot(validation.value);

    if (!result.ok) {
      if (result.reason === "taken") {
        return NextResponse.json(
          {
            error: "already_claimed",
            message: `${result.plot.coord} belongs to @${result.plot.handle}.`,
            plot: result.plot,
          },
          { status: 409, headers: NO_STORE },
        );
      }
      return NextResponse.json(
        { error: "out_of_bounds", message: "That address is not on the land." },
        { status: 400, headers: NO_STORE },
      );
    }

    return NextResponse.json(
      { plot: result.plot },
      {
        status: 201,
        headers: { ...NO_STORE, location: `/plot/${result.plot.coord}` },
      },
    );
  } catch (error) {
    console.error("[llnad] claim failed", error);
    return NextResponse.json(
      { error: "claim_failed", message: "The land record could not be written. Try again." },
      { status: 500, headers: NO_STORE },
    );
  }
}
