import type { Metadata } from "next";

import { LockedPanel, Panel, SectionHeader, SourceUnavailable, EmptyState } from "@/components/ui";
import { PRO_FEATURES, getProState } from "@/lib/pro";
import { walletFlowState } from "@/lib/sources";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Wallets",
  description: "Wallet flow and buyer clusters across tracked Pump.fun markets.",
};

export default async function WalletsPage() {
  const wallets = walletFlowState();
  const pro = getProState();

  return (
    <div className="mx-auto w-full max-w-[1220px] px-3 py-7 sm:px-5">
      <h1 className="text-[26px] font-semibold tracking-tight text-ink sm:text-[32px]">Wallets</h1>
      <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-muted">
        Per-wallet buys and sells, repeated-buyer clusters, and creator wallet movement across
        tracked markets.
      </p>

      <section className="mt-7">
        <SectionHeader title="Wallet flow" />
        <Panel>
          {wallets.configured ? (
            <EmptyState
              title="No wallet activity yet"
              body="The indexer is configured. Rows appear as transactions are observed on tracked markets."
            />
          ) : (
            <SourceUnavailable
              source="transaction indexer"
              detail="the market API aggregates pairs, not wallets, so wallet flow needs its own source"
              needs={wallets.missingEnv}
            />
          )}
        </Panel>
        <p className="mt-2 text-[11px] leading-relaxed text-muted">
          Cluster scoring is not shown until the indexer is supplying transactions — a cluster graph
          built from nothing would be meaningless.
        </p>
      </section>

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
