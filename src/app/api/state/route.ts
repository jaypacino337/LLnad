import { NextResponse } from "next/server";

import { getWorldState } from "@/lib/clone-api";

export const dynamic = "force-dynamic";

/** The whole living city in one poll: clones, vitality, and the feed. */
export async function GET() {
  const world = await getWorldState();
  return NextResponse.json(world, {
    status: world.status === "live" ? 200 : 503,
    headers: { "cache-control": "no-store" },
  });
}
