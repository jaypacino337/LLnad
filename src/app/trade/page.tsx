import type { Metadata } from "next";
import { cookies } from "next/headers";

import { AccountPanel } from "@/components/account-panel";
import { TradeForm } from "@/components/trade-form";
import { Panel, SectionHeader, SourceUnavailable } from "@/components/ui";
import { getMarketSnapshot } from "@/lib/market";
import { SESSION_COOKIE, verifySession } from "@/lib/player";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trade",
  description: "Open paper leverage positions on live Pump.fun markets.",
};

export default async function TradePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const [{ token }, snapshot, cookieStore] = await Promise.all([
    searchParams,
    getMarketSnapshot(),
    cookies(),
  ]);
  const signedIn = verifySession(cookieStore.get(SESSION_COOKIE)?.value) !== null;

  return (
    <div className="mx-auto w-full max-w-[1220px] px-3 py-7 sm:px-5">
      <h1 className="text-[26px] font-semibold tracking-tight text-ink sm:text-[32px]">Trade</h1>
      <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-muted">
        Paper orders filled at the live indexed price. Isolated margin — the most a position can
        lose is the margin behind it.
      </p>

      <div className="mt-7 grid gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">
        <section className="min-w-0">
          <SectionHeader title="Order" />
          <Panel padded>
            {snapshot.status !== "live" ? (
              <SourceUnavailable source={snapshot.source} detail={snapshot.error} />
            ) : (
              <TradeForm
                signedIn={signedIn}
                initialToken={token}
                tokens={snapshot.tokens.map((entry) => ({
                  tokenAddress: entry.tokenAddress,
                  symbol: entry.symbol,
                  name: entry.name,
                  priceUsd: entry.priceUsd,
                }))}
              />
            )}
          </Panel>
        </section>

        <section className="min-w-0">
          <SectionHeader title="Your positions" />
          <AccountPanel signedIn={signedIn} />
        </section>
      </div>
    </div>
  );
}
