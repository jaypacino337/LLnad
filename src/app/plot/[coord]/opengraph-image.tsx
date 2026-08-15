import { ImageResponse } from "next/og";

import { parseCoord, regionName, toCoord } from "@/lib/land";
import { getColor } from "@/lib/palette";
import { getPlot } from "@/lib/store";

export const alt = "A plot on Solanda";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export const dynamic = "force-dynamic";

const INK = "#e9e7de";
const MUTED = "#8e9793";
const BG = "#0a0e0d";
const LINE = "#212c29";

export default async function Image({ params }: { params: Promise<{ coord: string }> }) {
  const { coord } = await params;
  const position = parseCoord(coord);
  const canonical = position ? toCoord(position.col, position.row) : coord.toUpperCase();
  const plot = position ? await getPlot(canonical) : null;
  const color = plot ? getColor(plot.color) : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BG,
          color: INK,
          padding: 64,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{ width: 18, height: 18, border: `2px solid ${INK}`, borderRadius: 3, display: "flex" }}
          />
          <div style={{ fontSize: 22, letterSpacing: 7, color: MUTED }}>SOLANDA</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          {plot && color ? (
            <div
              style={{
                width: 180,
                height: 180,
                borderRadius: 12,
                background: color.hex,
                color: color.ink,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 96,
              }}
            >
              {plot.glyph}
            </div>
          ) : (
            <div
              style={{
                width: 180,
                height: 180,
                borderRadius: 12,
                border: `3px dashed ${LINE}`,
                display: "flex",
              }}
            />
          )}

          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ fontSize: 26, color: MUTED, letterSpacing: 4 }}>
              {position ? regionName(position.col, position.row).toUpperCase() : "OFF THE MAP"}
            </div>
            <div style={{ fontSize: 68, lineHeight: 1.1, marginTop: 10, letterSpacing: -1 }}>
              {plot ? plot.title : `${canonical} is unclaimed`}
            </div>
            <div style={{ fontSize: 30, color: MUTED, marginTop: 16 }}>
              {plot ? `${plot.coord} · @${plot.handle}` : "Nobody has taken this address yet."}
            </div>
          </div>
        </div>

        <div style={{ fontSize: 24, color: MUTED }}>
          {plot ? "A plot on the map" : "Claim it before somebody else does"}
        </div>
      </div>
    ),
    size,
  );
}
