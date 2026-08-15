import { ImageResponse } from "next/og";

import { GRID_COLS, GRID_ROWS } from "@/lib/land";
import { PLOT_COLORS } from "@/lib/palette";
import { listPlots } from "@/lib/store";

export const alt = "Solanda — claim your plot of the web";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Reads the register, so this cannot be prerendered at build time.
export const dynamic = "force-dynamic";

const INK = "#e9e7de";
const MUTED = "#8e9793";
const BG = "#0a0e0d";
const ACCENT = "#d9a441";

export default async function Image() {
  const plots = await listPlots();
  const claimed = plots.length;
  const available = GRID_COLS * GRID_ROWS - claimed;

  // A scaled-down version of the real map, so the card shows actual land.
  const pixel = 7;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: BG,
          color: INK,
          padding: 64,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 22,
                height: 22,
                border: `2px solid ${INK}`,
                borderRadius: 3,
                display: "flex",
              }}
            />
            <div style={{ fontSize: 26, letterSpacing: 8, color: INK }}>SOLANDA</div>
          </div>

          <div style={{ fontSize: 76, lineHeight: 1.05, marginTop: 28, letterSpacing: -2 }}>
            Claim your plot
          </div>
          <div style={{ fontSize: 76, lineHeight: 1.05, letterSpacing: -2 }}>of the web.</div>

          <div style={{ display: "flex", gap: 40, marginTop: 40, fontSize: 22, color: MUTED }}>
            <div style={{ display: "flex", gap: 10 }}>
              <span style={{ color: ACCENT }}>{claimed}</span>
              <span>claimed</span>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <span style={{ color: INK }}>{available}</span>
              <span>still empty</span>
            </div>
          </div>
        </div>

        <div
          style={{
            position: "relative",
            width: GRID_COLS * pixel,
            height: GRID_ROWS * pixel,
            display: "flex",
            border: `1px solid #212c29`,
            alignSelf: "center",
          }}
        >
          {plots.slice(0, 400).map((plot) => (
            <div
              key={plot.coord}
              style={{
                position: "absolute",
                left: plot.col * pixel,
                top: plot.row * pixel,
                width: pixel,
                height: pixel,
                background:
                  PLOT_COLORS.find((color) => color.key === plot.color)?.hex ?? PLOT_COLORS[0].hex,
              }}
            />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
