import { ImageResponse } from "next/og";

export const alt = "CLONE — every coin gets a clone";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** One sample sprite, drawn as divs so the card needs no asset files. */
const SPRITE = [
  "..XX..XX..",
  ".XXXXXXXX.",
  ".X.XXXX.X.",
  ".XXXXXXXX.",
  "XXXXXXXXXX",
  "..XX..XX..",
];

/**
 * Social card. Brand only — no metrics, so a cached share can never show
 * stale numbers.
 */
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f4f0e4",
          backgroundImage:
            "linear-gradient(to right, rgba(23,20,16,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(23,20,16,0.05) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          color: "#171410",
          fontFamily: "monospace",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", marginBottom: 36 }}>
          {SPRITE.map((row, y) => (
            <div key={y} style={{ display: "flex" }}>
              {row.split("").map((cell, x) => (
                <div
                  key={x}
                  style={{
                    width: 16,
                    height: 16,
                    backgroundColor: cell === "X" ? "#1f3df0" : "transparent",
                  }}
                />
              ))}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", fontSize: 108, fontWeight: 700, letterSpacing: 10 }}>
          CLONE
          <div style={{ width: 30, height: 86, backgroundColor: "#1f3df0", marginLeft: 14 }} />
        </div>
        <div style={{ marginTop: 22, fontSize: 34, color: "#3d3a33" }}>every coin gets a clone</div>
        <div style={{ marginTop: 14, fontSize: 22, color: "#7d7768" }}>
          it walks · it talks · it naps · live volume is its pulse
        </div>
      </div>
    ),
    size,
  );
}
