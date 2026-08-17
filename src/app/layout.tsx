import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getMarketSnapshot } from "@/lib/market";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PumpXBT — AI intelligence for Pump.fun",
    template: "%s · PumpXBT",
  },
  description:
    "Track launches, wallet flow, market momentum, verified calls, and on-chain activity in one live feed.",
  openGraph: {
    title: "PumpXBT — AI intelligence for Pump.fun",
    description:
      "Track launches, wallet flow, market momentum, verified calls, and on-chain activity in one live feed.",
    siteName: "PumpXBT",
    type: "website",
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The header's agent light reflects the real upstream state, not a constant.
  const snapshot = await getMarketSnapshot();

  return (
    <html lang="en">
      <body className="min-h-dvh">
        <div className="flex min-h-dvh flex-col">
          <SiteHeader online={snapshot.status === "live"} />
          <main className="flex-1">{children}</main>
          <SiteFooter source={snapshot.source} />
        </div>
      </body>
    </html>
  );
}
