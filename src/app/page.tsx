import { cookies } from "next/headers";
import Link from "next/link";

import { AgentFeed } from "@/components/agent-feed";
import { MarketTable } from "@/components/market-table";
import { TrendingList } from "@/components/trending-list";
import { WalletFlowTable } from "@/components/wallet-flow";
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
import { age, compact, shortAddress, usd } from "@/lib/format";
import { callMultiple, getCalls } from "@/lib/calls";
import { getMarketSnapshot, trending } from "@/lib/market";
import { PRO_COOKIE, PRO_FEATURES, getProState } from "@/lib/pro";
import { deriveSignals } from "@/lib/signals";
import { getTreasury } from "@/lib/treasury";
import { getWalletFlow } from "@/lib/wallets";

// Live market data: never served from a static build.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const snapshot = await getMarketSnapshot();

  const [flow, treasury, calls] = await Promise.all([
    getWalletFlow(
      snapshot.tokens
        .filter((token) => token.isPumpFun)
        .map((token) => ({ mint: token.tokenAddress, symbol: token.symbol, priceUsd: token.priceUsd })),
    ),
    getTreasury(),
    getCalls(),
  ]);

  const signals = deriveSignals(snapshot.tokens, 8);
  const momentum = trending(snapshot.tokens, 8);
  const pro = getProState(cookieStore.get(PRO_COOKIE)?.value);

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
              action={{ label: "All signals", href: "/signals" }}
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
              {flow.state === "unconfigured" ? (
                <SourceUnavailable source="transaction indexer" needs={flow.missingEnv} compact />
              ) : flow.state === "unavailable" ? (
                <SourceUnavailable source="transaction indexer" detail={flow.error} compact />
              ) : flow.rows.length === 0 ? (
                <EmptyState
                  title="No swaps observed"
                  body="The indexer is live but returned no recent swaps for the tracked markets."
                />
              ) : (
                <WalletFlowTable rows={flow.rows.slice(0, 8)} />
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
              ) : (
                <ul className="divide-y divide-line">
                  {calls.slice(0, 5).map((call) => {
                    const multiple = callMultiple(call);
                    return (
                      <li key={call.id} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="text-[13px] font-medium text-ink">${call.symbol}</span>
                        <span className="font-mono text-[11px] text-muted tnum">
                          in {usd(call.entryMarketCap)}
                        </span>
                        <span className="ml-auto font-mono text-[12px] tnum">
                          {multiple ? (
                            <span className={multiple >= 1 ? "text-mint-text" : "text-down"}>
                              {multiple.toFixed(2)}x
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </span>
                        <span className="font-mono text-[10.5px] text-muted">{call.status}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          </section>
        </div>

        {/* Treasury */}
        <section className="mt-8">
          <SectionHeader
            title="Treasury & strategy"
            note={treasury.state === "live" ? shortAddress(treasury.wallet ?? "") : undefined}
          />
          <Panel>
            {treasury.state === "unconfigured" ? (
              <SourceUnavailable source="treasury wallet" needs={treasury.missingEnv} compact />
            ) : treasury.state === "unavailable" ? (
              <SourceUnavailable source="treasury rpc" detail={treasury.error} compact />
            ) : (
              <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
                <MetricCard label="SOL balance" value={`${(treasury.solBalance ?? 0).toFixed(3)}`} />
                <MetricCard label="Token positions" value={String(treasury.tokenBalances.length)} />
                {treasury.tokenBalances.slice(0, 2).map((token) => (
                  <MetricCard
                    key={token.mint}
                    label={shortAddress(token.mint)}
                    value={compact(token.amount)}
                  />
                ))}
              </div>
            )}
          </Panel>
          {treasury.state === "live" ? (
            <p className="mt-2 text-[11px] text-muted">
              Balances only. PnL needs trade history this deployment does not hold, so none is shown.
            </p>
          ) : null}
        </section>

        {/* Pro */}
        <section id="pro" className="mt-8 scroll-mt-20">
          <SectionHeader
            title="Pro"
            note={
              pro.unlocked ? "Unlocked" : pro.configured ? "Token gated" : "Gating not configured"
            }
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
