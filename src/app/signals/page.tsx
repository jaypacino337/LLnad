import type { Metadata } from "next";

import { AgentFeed } from "@/components/agent-feed";
import { EmptyState, Panel, SectionHeader, SourceUnavailable } from "@/components/ui";
import { getMarketSnapshot } from "@/lib/market";
import { deriveSignals } from "@/lib/signals";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Signals",
  description: "Deterministic rule matches over live Pump.fun market data.",
};

const RULES = [
  { name: "Volume acceleration", trigger: "1h volume ≥ 2x the average hour of the last six, and 1h volume > $5k" },
  { name: "Momentum", trigger: "1h change ≥ +15% on top of a positive 6h change" },
  { name: "Buy pressure", trigger: "≥66% of the last hour's trades are buys, over ≥40 trades" },
  { name: "Sell pressure", trigger: "≥66% of the last hour's trades are sells, over ≥40 trades" },
  { name: "Thin liquidity", trigger: "Market cap ≥ 25x pooled liquidity" },
  { name: "New launch", trigger: "Pair under 6h old with > $10k traded in the last hour" },
];

export default async function SignalsPage() {
  const snapshot = await getMarketSnapshot();
  const signals = deriveSignals(snapshot.tokens, 40);
  const live = snapshot.status === "live";

  return (
    <div className="mx-auto w-full max-w-[1220px] px-3 py-7 sm:px-5">
      <h1 className="text-[26px] font-semibold tracking-tight text-ink sm:text-[32px]">Signals</h1>
      <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-muted">
        Rule matches over live market data. Each entry states the measurement that triggered it, so
        nothing here is an unverifiable claim.
      </p>

      <div className="mt-7 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="min-w-0">
          <SectionHeader title="Active matches" meta={live ? `${signals.length}` : undefined} />
          <Panel>
            {!live ? (
              <SourceUnavailable source={snapshot.source} detail={snapshot.error} />
            ) : signals.length === 0 ? (
              <EmptyState
                title="No rules matched"
                body="Nothing in the indexed set clears a threshold right now."
              />
            ) : (
              <AgentFeed signals={signals} at={snapshot.fetchedAt} />
            )}
          </Panel>
        </section>

        <section className="min-w-0">
          <SectionHeader title="Rule set" note="Thresholds, in full" />
          <Panel>
            <ul className="divide-y divide-line">
              {RULES.map((rule) => (
                <li key={rule.name} className="px-4 py-3">
                  <p className="text-[13px] font-medium text-ink">{rule.name}</p>
                  <p className="mt-1 font-mono text-[11px] leading-relaxed text-muted">
                    {rule.trigger}
                  </p>
                </li>
              ))}
            </ul>
          </Panel>
        </section>
      </div>
    </div>
  );
}
