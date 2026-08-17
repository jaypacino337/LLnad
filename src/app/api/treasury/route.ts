import { NextResponse } from "next/server";

import { getTreasury } from "@/lib/treasury";

export const dynamic = "force-dynamic";

export async function GET() {
  const treasury = await getTreasury();
  return NextResponse.json(treasury, {
    status: treasury.state === "unavailable" ? 503 : 200,
    headers: { "cache-control": "no-store" },
  });
}
