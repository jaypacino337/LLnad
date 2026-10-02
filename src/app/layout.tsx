import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getMarketSnapshot } from "@/lib/market";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CLONE — every coin gets a clone",
    template: "%s · CLONE",
  },
  description:
    "Summon a pixel clone of any live Solana token. It walks a retro-internet city, talks, and lives on real trading volume — asleep the hour its coin stops trading.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  openGraph: {
    title: "CLONE — every coin gets a clone",
    description:
      "Summon a pixel clone of any live Solana token. It lives on real trading volume and sleeps when the trades stop.",
    siteName: "CLONE",
    type: "website",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The header's live light reflects the real upstream state, not a constant.
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
