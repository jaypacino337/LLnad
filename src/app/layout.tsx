import type { Metadata } from "next";
import { cookies } from "next/headers";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getMarketSnapshot } from "@/lib/market";
import { SESSION_COOKIE, verifySession } from "@/lib/player";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Hood ST — paper trading league for Pump.fun",
    template: "%s · Hood ST",
  },
  description:
    "Trade live Pump.fun markets with a $10K paper balance. Leverage up to 20x, real prices, zero risk. Daily, weekly and monthly leagues.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  openGraph: {
    title: "Hood ST — paper trading league for Pump.fun",
    description:
      "Trade live Pump.fun markets with a $10K paper balance. Leverage, liquidations, and daily/weekly/monthly leagues.",
    siteName: "Hood ST",
    type: "website",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const wallet = verifySession(cookieStore.get(SESSION_COOKIE)?.value);
  // The header's price light reflects the real upstream state, not a constant.
  const snapshot = await getMarketSnapshot();

  return (
    <html lang="en">
      <body className="min-h-dvh">
        <div className="flex min-h-dvh flex-col">
          <SiteHeader online={snapshot.status === "live"} wallet={wallet} />
          <main className="flex-1">{children}</main>
          <SiteFooter source={snapshot.source} />
        </div>
      </body>
    </html>
  );
}
