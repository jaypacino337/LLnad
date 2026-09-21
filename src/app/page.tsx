import { cookies } from "next/headers";
import Link from "next/link";

import { AgentFeed } from "@/components/agent-feed";
import { AgentMascot } from "@/components/brand-mark";
import { AccountPanel } from "@/components/account-panel";
import { MarketTable } from "@/components/market-table";
import {
  EmptyState,
  MetricCard,
  MetricGrid,
  Panel,
  Pill,
  SectionHeader,
  SourceUnavailable,
} from "@/components/ui";
import { shortAddress } from "@/lib/format";
import { pricesForGame } from "@/lib/game-api";
import { accountCount, leaderboard } from "@/lib/game-store";
import { getMarketSnapshot } from "@/lib/market";
import { SESSION_COOKIE, isEligible, verifySession } from "@/lib/player";
import { deriveSignals } from "@/lib/signals";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookieStore = await cookies();
  const signedIn = verifySession(cookieStore.get(SESSION_COOKIE)?.value) !== null;
  const snapshot = await getMarketSnapshot();
  const prices = await pricesForGame();
  const [players, topToday] = await Promise.all([accountCount(), leaderboard("daily", prices, new Date(), 5)]);
  const signals = deriveSignals(snapshot.tokens, 6);
  const live = snapshot.status === "live";

  return (
    <>
      {/* Hero — compact: the game starts one scroll-inch below. */}
      <section className="relative overflow-hidden border-b border-line">
        <div aria-hidden className="pointer-events-none absolute inset-0 grid-wash opacity-70" />
        <div className="relative mx-auto flex w-full max-w-[1220px] items-end justify-between gap-6 px-3 pt-8 pb-6 sm:px-5 sm:pt-10">
          <div className="min-w-0">
            <Pill tone="mint">
              <span className={`size-1.5 rounded-full ${live ? "bg-mint live-dot" : "bg-down"}`} />
              {live ? "Prices live" : "Prices unavailable"}
            </Pill>

            <h1 className="mt-3 text-[30px] leading-[1.05] font-semibold tracking-tight text-ink sm:text-[42px]">
              Hood ST
            </h1>
            <p className="mt-1 text-[17px] font-medium tracking-tight text-mint-text sm:text-[20px]">
              Paper trading league for Pump.fun.
            </p>
            <p className="mt-2.5 max-w-xl text-[13.5px] leading-relaxed text-muted">
              $10,000 paper balance. Long or short live markets with up to 20x leverage. Daily,
              weekly and monthly leagues — real prices, zero risk.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/trade"
                className="rounded-md bg-ink px-4 py-2.5 text-[13.5px] font-semibold text-bg transition hover:opacity-90"
              >
                Start trading
              </Link>
              <Link
                href="/leaderboard"
                className="rounded-md border border-line bg-bg px-4 py-2.5 text-[13.5px] font-medium text-ink transition hover:border-line-strong"
              >
                Leaderboard
              </Link>
            </div>
          </div>

          <AgentMascot className="hidden w-[140px] shrink-0 sm:block lg:w-[172px] -mb-6" />
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1220px] px-3 py-5 sm:px-5">
        {/* Stats strip */}
        <MetricGrid>
          <MetricCard label="Players" value={String(players)} hint="wallets with accounts" />
          <MetricCard
            label="Markets"
            value={live ? String(snapshot.tokens.length) : "—"}
            hint={live ? "tradeable now" : "source unreachable"}
          />
          <MetricCard label="Signals" value={live ? String(signals.length) : "—"} hint="rule matches" />
          <MetricCard label="Start balance" value="$10K" hint="paper, per wallet" />
          <MetricCard label="Max leverage" value="20x" hint="isolated margin" />
        </MetricGrid>

        {/* Your account */}
        <section className="mt-8">
          <SectionHeader title="Your account" action={{ label: "Portfolio", href: "/portfolio" }} />
          <AccountPanel signedIn={signedIn} />
        </section>

        {/* Markets */}
        <section className="mt-8">
          <SectionHeader
            title="Markets"
            meta={live ? `${snapshot.tokens.length} tradeable` : undefined}
            note={live ? `via ${snapshot.source}` : undefined}
          />
          <Panel>
            {!live ? (
              <SourceUnavailable source={snapshot.source} detail={snapshot.error} />
            ) : snapshot.tokens.length === 0 ? (
              <EmptyState
                title="No markets returned"
                body="The source responded but had no Solana markets to report."
              />
            ) : (
              <MarketTable tokens={snapshot.tokens} />
            )}
          </Panel>
        </section>

        {/* League + signals */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="min-w-0">
            <SectionHeader title="Today's league" action={{ label: "Full board", href: "/leaderboard" }} />
            <Panel>
              {topToday.length === 0 ? (
                <EmptyState
                  title="Nobody on the board yet"
                  body="Connect a wallet, take a position, and today's league starts ranking."
                />
              ) : (
                <ol className="divide-y divide-line">
                  {topToday.map((row, index) => (
                    <li key={row.wallet} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="w-4 font-mono text-[11px] text-muted tnum">{index + 1}</span>
                      <span className="font-mono text-[12.5px] text-ink">{shortAddress(row.wallet)}</span>
                      {isEligible(row.heldAmount) ? (
                        <span className="rounded bg-mint-wash px-1.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase text-mint-text">
                          rewards
                        </span>
                      ) : null}
                      <span
                        className={`ml-auto font-mono text-[13px] tnum ${row.periodReturn >= 0 ? "text-mint-text" : "text-down"}`}
                      >
                        {(row.periodReturn * 100).toFixed(2)}%
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
          </section>

          <section className="min-w-0">
            <SectionHeader title="Signals" note="Deterministic rules over live market data" />
            <Panel>
              {!live ? (
                <SourceUnavailable source={snapshot.source} compact />
              ) : signals.length === 0 ? (
                <EmptyState title="No rules matched" body="Entries appear the moment a threshold clears." />
              ) : (
                <AgentFeed signals={signals} at={snapshot.fetchedAt} />
              )}
            </Panel>
          </section>
        </div>

        <p className="mt-8 text-center text-[11.5px] text-muted">
          Every fill uses a live indexed price — nothing is simulated from thin air.{" "}
          <Link href="/rules" className="text-mint-text hover:underline">
            How the game works →
          </Link>
        </p>
      </div>
    </>
  );
}
