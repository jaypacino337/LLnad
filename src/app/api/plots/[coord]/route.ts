import { NextResponse } from "next/server";

import { parseCoord, regionName } from "@/lib/land";
import { getPlot } from "@/lib/store";

export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "no-store" } as const;

export async function GET(_request: Request, context: { params: Promise<{ coord: string }> }) {
  const { coord } = await context.params;
  const position = parseCoord(coord);

  if (!position) {
    return NextResponse.json(
      { error: "out_of_bounds", message: "That address is not on the land." },
      { status: 400, headers: NO_STORE },
    );
  }

  const plot = await getPlot(coord);
  const canonical = coord.trim().toUpperCase();

  if (!plot) {
    return NextResponse.json(
      {
        coord: canonical,
        claimed: false,
        region: regionName(position.col, position.row),
      },
      { headers: NO_STORE },
    );
  }

  return NextResponse.json(
    { coord: canonical, claimed: true, region: regionName(plot.col, plot.row), plot },
    { headers: NO_STORE },
  );
}
