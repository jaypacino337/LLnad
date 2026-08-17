import { readFileSync } from "node:fs";
import path from "node:path";

import { ImageResponse } from "next/og";

import { BRAND } from "@/lib/brand";

export const alt = "PumpXBT — AI intelligence for Pump.fun";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Social card. When the real banner is committed at public/brand/banner.png it
 * becomes the card; otherwise a brand-only layout is drawn. Neither variant
 * carries metrics, so a cached share can never show stale numbers.
 */
export default function Image() {
  if (BRAND.banner) {
    try {
      // Literal path so Next's file tracing bundles the asset with this route.
      const banner = readFileSync(path.join(process.cwd(), "public", "brand", "banner.png"));
      return new ImageResponse(
        (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#ffffff",
            }}
          >
            <img
              src={`data:image/png;base64,${banner.toString("base64")}`}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        ),
        size,
      );
    } catch {
      // Fall through to the drawn card if the file cannot be read at runtime.
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#ffffff",
          padding: 80,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 84, fontWeight: 700, letterSpacing: -3 }}>
            <span style={{ color: "#0a0c0a" }}>Pump</span>
            <span style={{ color: "#0a9d51" }}>XBT</span>
          </div>
          <div style={{ marginTop: 14, fontSize: 34, color: "#33383a" }}>
            AI intelligence for Pump.fun.
          </div>
          <div style={{ marginTop: 26, fontSize: 21, color: "#71787c", maxWidth: 620 }}>
            Launches, wallet flow, momentum, verified calls and on-chain activity in one live feed.
          </div>
        </div>

        <svg viewBox="0 0 28 28" width="240" height="240">
          <rect width="28" height="28" rx="7" fill="#0a0c0a" />
          <path d="M14 5.4c-4.5 0-7.9 3.1-7.9 7.6v9.6h15.8v-9.6c0-4.5-3.4-7.6-7.9-7.6Z" fill="#2fe07f" />
          <path d="M14 10.6c-2.9 0-5 1.9-5 4.6v7.4h10V15.2c0-2.7-2.1-4.6-5-4.6Z" fill="#0a0c0a" />
          <circle cx="11.7" cy="16.1" r="1.25" fill="#2fe07f" />
          <circle cx="16.3" cy="16.1" r="1.25" fill="#2fe07f" />
          <rect x="17.4" y="6.1" width="5.6" height="3.1" rx="1.55" fill="#ffffff" />
          <path d="M18.95 6.1h1.55v3.1h-1.55a1.55 1.55 0 0 1 0-3.1Z" fill="#2fe07f" />
        </svg>
      </div>
    ),
    size,
  );
}
