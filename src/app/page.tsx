import Link from "next/link";

import { AgentFeed } from "@/components/agent-feed";
import { MarketTable } from "@/components/market-table";
import { TrendingList } from "@/components/trending-list";
import {
  EmptyState,
  LockedPanel,
  MetricCard,
  MetricGrid,
  Panel,
  Pill,
  SectionHeader,
  SourceUnavailable,
} from "@/components/ui";
import { age, usd } from "@/lib/format";
import { getMarketSnapshot, trending } from "@/lib/market";
import { PRO_FEATURES, getProState } from "@/lib/pro";
import { deriveSignals } from "@/lib/signals";
import { getCalls, treasuryState, walletFlowState } from "@/lib/sources";

// Live market data: never served from a static build.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const snapshot = await getMarketSnapshot();
  const signals = deriveSignals(snapshot.tokens, 8);
  const momentum = trending(snapshot.tokens, 8);
  const wallets = walletFlowState();
  const treasury = treasuryState();
  const pro = getProState();
  const calls = getCalls();

  const live = snapshot.status === "live";
  const totalVolume = snapshot.tokens.reduce((sum, token) => sum + (token.volume24h ?? 0), 0);
  const pumpCount = snapshot.tokens.filter((token) => token.isPumpFun).length;

  return (
    <>
      {/* Hero — compact on purpose: the product starts one scroll-inch below. */}
      <section className="relative border-b border-line">
        <div aria-hidden className="pointer-events-none absolute inset-0 grid-wash opacity-70" />
        <div className="relative mx-auto w-full max-w-[1220px] px-3 pt-8 pb-6 sm:px-5 sm:pt-10">
          <Pill tone="mint">
            <span className={`size-1.5 rounded-full ${live ? "bg-mint live-dot" : "bg-down"}`} />
            {live ? "Agent online" : "Agent degraded"}
          </Pill>

          <h1 className="mt-3 text-[30px] leading-[1.05] font-semibold tracking-tight text-ink sm:text-[42px]">
            PumpXBT
          </h1>
          <p className="mt-1 text-[17px] font-medium tracking-tight text-mint-text sm:text-[20px]">
            AI intelligence for Pump.fun.
          </p>
          <p className="mt-2.5 max-w-xl text-[13.5px] leading-relaxed text-muted">
            Track launches, wallet flow, market momentum, verified calls, and on-chain activity in
            one live feed.
          </p>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1220px] px-3 py-5 sm:px-5">
        {/* Agent status strip */}
        <MetricGrid>
          <MetricCard
            label="Status"
            value={live ? "Online" : "Degraded"}
            tone={live ? "mint" : "default"}
            hint={live ? snapshot.source : "source unreachable"}
          />
          <MetricCard
            label="Last indexed"
            value={live ? `${age(new Date(snapshot.fetchedAt).getTime())} ago` : "—"}
            hint={live ? "auto-refreshes" : "no successful fetch"}
          />
          <MetricCard
            label="Markets indexed"
            value={live ? String(snapshot.tokens.length) : "—"}
            hint={live ? `${pumpCount} on pump.fun` : undefined}
          />
          <MetricCard
            label="Signals"
            value={live ? String(signals.length) : "—"}
            hint="rule matches now"
          />
          <MetricCard
            label="Vol 24h (indexed)"
            value={live && totalVolume > 0 ? usd(totalVolume) : "—"}
            hint="sum of tracked pairs"
          />
        </MetricGrid>

        {/* Live market feed */}
        <section className="mt-8">
          <SectionHeader
            title="Live Pump market feed"
            meta={live ? `${snapshot.tokens.length} markets` : undefined}
            note={live ? `via ${snapshot.source}` : undefined}
          />
          <Panel>
            {!live ? (
              <SourceUnavailable source={snapshot.source} detail={snapshot.error} />
            ) : snapshot.tokens.length === 0 ? (
              <EmptyState
                title="No markets returned"
                body="The source responded but had no Solana markets to report. This view fills in as new pairs are indexed."
              />
            ) : (
              <MarketTable tokens={snapshot.tokens} />
            )}
          </Panel>
        </section>

        {/* Agent feed + momentum */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <section className="min-w-0">
            <SectionHeader
              title="Agent feed"
              meta={live ? `${signals.length} active` : undefined}
              note="Deterministic rules over live market data"
            />
            <Panel>
              {!live ? (
                <SourceUnavailable source={snapshot.source} compact />
              ) : signals.length === 0 ? (
                <EmptyState
                  title="No rules matched"
                  body="Nothing in the indexed set currently clears a rule threshold. Entries appear the moment one does."
                />
              ) : (
                <AgentFeed signals={signals} at={snapshot.fetchedAt} />
              )}
            </Panel>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              Every entry is a threshold over figures the market API returned, and quotes the numbers
              it used. No inference is claimed beyond the stated measurement.
            </p>
          </section>

          <section className="min-w-0">
            <SectionHeader title="Momentum" note="1h volume vs its 6h average" />
            <Panel>
              {!live ? (
                <SourceUnavailable source={snapshot.source} compact />
              ) : momentum.length === 0 ? (
                <EmptyState
                  title="Nothing accelerating"
                  body="No indexed market is trading above its recent hourly average right now."
                />
              ) : (
                <TrendingList tokens={momentum} />
              )}
            </Panel>
          </section>
        </div>

        {/* Wallet flow + calls */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="min-w-0">
            <SectionHeader
              title="Wallet & cluster flow"
              action={{ label: "Wallets", href: "/wallets" }}
            />
            <Panel>
              {wallets.configured ? (
                <EmptyState
                  title="No wallet activity yet"
                  body="The indexer is configured. Clusters appear once repeated buyers are observed across tracked markets."
                />
              ) : (
                <SourceUnavailable
                  source="transaction indexer"
                  needs={wallets.missingEnv}
                  compact
                />
              )}
            </Panel>
          </section>

          <section className="min-w-0">
            <SectionHeader title="PumpXBT calls" action={{ label: "Track record", href: "/calls" }} />
            <Panel>
              {calls.length === 0 ? (
                <EmptyState
                  title="No verified calls yet"
                  body="Calls are recorded with entry market cap and tracked afterwards. The track record stays empty until the first one is published."
                />
              ) : null}
            </Panel>
          </section>
        </div>

        {/* Treasury */}
        <section className="mt-8">
          <SectionHeader title="Treasury & strategy" />
          <Panel>
            {treasury.configured ? (
              <EmptyState
                title="No treasury activity recorded"
                body="The treasury wallet is configured. Positions and realised PnL appear once it transacts."
              />
            ) : (
              <SourceUnavailable source="treasury wallet" needs={treasury.missingEnv} compact />
            )}
          </Panel>
        </section>

        {/* Pro */}
        <section id="pro" className="mt-8 scroll-mt-20">
          <SectionHeader
            title="Pro"
            note={pro.configured ? "Token gated" : "Gating not configured"}
          />
          <LockedPanel
            title="Pro intelligence"
            features={PRO_FEATURES}
            requirement={pro.requirement}
          />
        </section>

        <p className="mt-8 text-center text-[11.5px] text-muted">
          Market data from {snapshot.source}. Signals are deterministic rules.{" "}
          <Link href="/agent" className="text-mint-text hover:underline">
            How the agent works →
          </Link>
        </p>
      </div>
    </>
  );
}
