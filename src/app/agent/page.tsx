import type { Metadata } from "next";
import { cookies } from "next/headers";

import { AgentStatus } from "@/components/agent-status";
import { ProUnlock } from "@/components/pro-unlock";
import {
  LockedPanel,
  MetricCard,
  MetricGrid,
  Panel,
  SectionHeader,
  SourceUnavailable,
} from "@/components/ui";
import { age } from "@/lib/format";
import { isAutopostConfigured, missingAutopostEnv } from "@/lib/autopost";
import { getMarketSnapshot } from "@/lib/market";
import { PRO_COOKIE, PRO_FEATURES, getProState } from "@/lib/pro";
import { deriveSignals } from "@/lib/signals";
import { treasuryMissingEnv } from "@/lib/treasury";
import { walletMissingEnv } from "@/lib/wallets";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Agent",
  description: "What PumpXBT indexes, how signals are derived, and which sources are live.",
};

export default async function AgentPage() {
  const cookieStore = await cookies();
  const snapshot = await getMarketSnapshot();
  const signals = deriveSignals(snapshot.tokens, 40);
  const live = snapshot.status === "live";
  const pro = getProState(cookieStore.get(PRO_COOKIE)?.value);

  const sources = [
    {
      name: "Market data",
      provider: "dexscreener",
      live,
      detail: live
        ? `${snapshot.tokens.length} Solana markets indexed`
        : (snapshot.error ?? "unreachable"),
      needs: [] as string[],
    },
    {
      name: "Signals",
      provider: "deterministic rules",
      live,
      detail: live ? `${signals.length} matches over indexed markets` : "needs market data",
      needs: [],
    },
    {
      name: "Wallet flow",
      provider: "helius indexer",
      live: walletMissingEnv().length === 0,
      detail: "per-wallet buys and sells, repeated-buyer clusters",
      needs: walletMissingEnv(),
    },
    {
      name: "Treasury",
      provider: "solana rpc",
      live: treasuryMissingEnv().length === 0,
      detail: "SOL and token balances of the treasury wallet",
      needs: treasuryMissingEnv(),
    },
    {
      name: "Pro gating",
      provider: "wallet signature + rpc",
      live: pro.configured,
      detail: "ed25519 signature verification plus an on-chain balance check",
      needs: pro.missingEnv,
    },
    {
      name: "Calls publishing",
      provider: "admin api",
      live: Boolean(process.env.ADMIN_SECRET),
      detail: "operator-only POST /api/calls with an entry market cap",
      needs: process.env.ADMIN_SECRET ? [] : ["ADMIN_SECRET"],
    },
    {
      name: "X autoposting",
      provider: "x api",
      live: isAutopostConfigured(),
      detail: isAutopostConfigured()
        ? "posts the strongest unposted signal on schedule"
        : "composes posts but sends nothing until credentials are set",
      needs: missingAutopostEnv(),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1220px] px-3 py-7 sm:px-5">
      <h1 className="text-[26px] font-semibold tracking-tight text-ink sm:text-[32px]">Agent</h1>
      <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-muted">
        What the agent indexes, how it decides something is worth showing, and which sources are
        actually live in this deployment.
      </p>

      <div className="mt-4">
        <AgentStatus status={snapshot.status} fetchedAt={snapshot.fetchedAt} />
      </div>

      <div className="mt-6">
        <MetricGrid>
          <MetricCard
            label="Status"
            value={live ? "Online" : "Degraded"}
            tone={live ? "mint" : "default"}
          />
          <MetricCard
            label="Last indexed"
            value={live ? `${age(new Date(snapshot.fetchedAt).getTime())} ago` : "—"}
          />
          <MetricCard label="Markets" value={live ? String(snapshot.tokens.length) : "—"} />
          <MetricCard label="Signals" value={live ? String(signals.length) : "—"} />
          <MetricCard label="Rules" value="6" hint="deterministic" />
        </MetricGrid>
      </div>

      <section className="mt-8">
        <SectionHeader title="Sources" note="Live state, per integration" />
        <Panel>
          <ul className="divide-y divide-line">
            {sources.map((source) => (
              <li key={source.name} className="flex flex-wrap items-start gap-x-4 gap-y-1.5 px-4 py-3">
                <span className="flex min-w-[150px] items-center gap-2">
                  <span
                    className={`size-1.5 shrink-0 rounded-full ${source.live ? "bg-mint" : "bg-line-strong"}`}
                    aria-hidden
                  />
                  <span className="text-[13px] font-medium text-ink">{source.name}</span>
                </span>
                <span className="font-mono text-[11px] text-muted">{source.provider}</span>
                <span className="min-w-0 flex-1 text-[12px] text-ink-soft">{source.detail}</span>
                <span className="font-mono text-[10.5px] whitespace-nowrap">
                  {source.live ? (
                    <span className="text-mint-text">live</span>
                  ) : source.needs.length > 0 ? (
                    <span className="text-muted">needs {source.needs.join(", ")}</span>
                  ) : (
                    <span className="text-down">unavailable</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </section>

      <section className="mt-8">
        <SectionHeader title="How signals work" />
        <Panel padded>
          <p className="text-[13px] leading-relaxed text-ink-soft">
            Each signal is a threshold over figures the market API returned — volume, price change,
            trade counts, liquidity, pair age. A rule fires only when its measurement clears the
            threshold, strength is how far past it the measurement sits, and every entry lists the
            numbers it used.
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">
            The same snapshot always produces the same output. Nothing here is a model prediction,
            and the agent will not assert market structure it cannot show the arithmetic for.
          </p>
        </Panel>
      </section>

      {!live ? (
        <section className="mt-8">
          <SectionHeader title="Market data" />
          <Panel>
            <SourceUnavailable source={snapshot.source} detail={snapshot.error} />
          </Panel>
        </section>
      ) : null}

      <section id="pro" className="mt-8 scroll-mt-20">
        <SectionHeader
          title="Pro"
          note={pro.unlocked ? "Unlocked" : pro.configured ? "Token gated" : "Not configured"}
        />
        <LockedPanel title="Pro intelligence" features={PRO_FEATURES} requirement={pro.requirement} />
        <div className="mt-3">
          <ProUnlock configured={pro.configured && !pro.unlocked} />
        </div>
      </section>
    </div>
  );
}
