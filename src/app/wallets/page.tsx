import type { Metadata } from "next";
import { cookies } from "next/headers";

import { WalletFlowTable } from "@/components/wallet-flow";
import { EmptyState, LockedPanel, Panel, SectionHeader, SourceUnavailable } from "@/components/ui";
import { shortAddress } from "@/lib/format";
import { getMarketSnapshot } from "@/lib/market";
import { PRO_COOKIE, PRO_FEATURES, getProState } from "@/lib/pro";
import { getWalletFlow } from "@/lib/wallets";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Wallets",
  description: "Wallet flow and buyer clusters across tracked Pump.fun markets.",
};

export default async function WalletsPage() {
  const cookieStore = await cookies();
  const snapshot = await getMarketSnapshot();
  const flow = await getWalletFlow(
    snapshot.tokens
      .filter((token) => token.isPumpFun)
      .map((token) => ({ mint: token.tokenAddress, symbol: token.symbol, priceUsd: token.priceUsd })),
  );
  const pro = getProState(cookieStore.get(PRO_COOKIE)?.value);

  return (
    <div className="mx-auto w-full max-w-[1220px] px-3 py-7 sm:px-5">
      <h1 className="text-[26px] font-semibold tracking-tight text-ink sm:text-[32px]">Wallets</h1>
      <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-muted">
        Per-wallet buys and sells and repeated-buyer clusters, observed by the transaction indexer
        across the markets on the live feed.
      </p>

      <div className="mt-7 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="min-w-0">
          <SectionHeader
            title="Recent flow"
            meta={flow.state === "live" ? `${flow.rows.length} swaps` : undefined}
          />
          <Panel>
            {flow.state === "unconfigured" ? (
              <SourceUnavailable
                source="transaction indexer"
                detail="the market API aggregates pairs, not wallets, so wallet flow needs its own source"
                needs={flow.missingEnv}
              />
            ) : flow.state === "unavailable" ? (
              <SourceUnavailable source="transaction indexer" detail={flow.error} />
            ) : flow.rows.length === 0 ? (
              <EmptyState
                title="No swaps observed"
                body="The indexer is live but returned no recent swaps for the tracked markets."
              />
            ) : (
              <WalletFlowTable rows={flow.rows} />
            )}
          </Panel>
        </section>

        <section className="min-w-0">
          <SectionHeader title="Repeat buyers" note="Wallets seen more than once" />
          <Panel>
            {flow.state !== "live" ? (
              <SourceUnavailable source="transaction indexer" needs={flow.missingEnv} compact />
            ) : flow.clusters.length === 0 ? (
              <EmptyState
                title="No clusters in this window"
                body="No wallet appears more than once in the observed swaps."
              />
            ) : (
              <ul className="divide-y divide-line">
                {flow.clusters.map((cluster) => (
                  <li key={cluster.wallet} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="font-mono text-[12px] text-ink">
                      {shortAddress(cluster.wallet, 6, 6)}
                    </span>
                    <span className="ml-auto font-mono text-[12px] text-mint-text tnum">
                      {cluster.trades} trades
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </section>
      </div>

      <section className="mt-8">
        <SectionHeader title="Smart wallets" note="Pro" />
        <LockedPanel
          title="Tracked smart wallets"
          features={PRO_FEATURES}
          requirement={pro.requirement}
        />
      </section>
    </div>
  );
}
