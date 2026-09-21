import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState, Panel, SectionHeader } from "@/components/ui";
import { shortAddress, usd } from "@/lib/format";
import { pricesForGame } from "@/lib/game-api";
import { leaderboard } from "@/lib/game-store";
import { isEligible, rewardGate } from "@/lib/player";
import type { Period } from "@/lib/game";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "Daily, weekly and monthly leagues ranked by paper return.",
};

const TABS: { period: Period; label: string }[] = [
  { period: "daily", label: "Daily" },
  { period: "weekly", label: "Weekly" },
  { period: "monthly", label: "Monthly" },
];

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params = await searchParams;
  const period: Period = TABS.some((tab) => tab.period === params.period)
    ? (params.period as Period)
    : "daily";

  const prices = await pricesForGame();
  const rows = await leaderboard(period, prices);
  const gate = rewardGate();

  return (
    <div className="mx-auto w-full max-w-[1220px] px-3 py-7 sm:px-5">
      <h1 className="text-[26px] font-semibold tracking-tight text-ink sm:text-[32px]">
        Leaderboard
      </h1>
      <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-muted">
        Ranked by return over the period (UTC), so joining late costs nothing.{" "}
        {gate.configured
          ? `Reward payouts require holding at least ${gate.minHold.toLocaleString("en-US")} ${gate.symbol}.`
          : "Reward gating is not configured yet — the ranking runs regardless."}
      </p>

      <div className="mt-5 flex gap-1.5">
        {TABS.map((tab) => (
          <Link
            key={tab.period}
            href={`/leaderboard?period=${tab.period}`}
            aria-current={tab.period === period ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 text-[13px] transition ${
              tab.period === period
                ? "bg-ink font-semibold text-bg"
                : "border border-line text-muted hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <section className="mt-5">
        <SectionHeader title={`${TABS.find((tab) => tab.period === period)!.label} league`} meta={`${rows.length} ranked`} />
        <Panel>
          {rows.length === 0 ? (
            <EmptyState
              title="Nobody on the board yet"
              body="Connect a wallet and take a position — the league ranks every account with activity this period."
            />
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-line bg-surface">
                      {["#", "Wallet", "Return", "Equity", "Open", "Rewards"].map((label, index) => (
                        <th
                          key={label}
                          className={`px-3 py-2 font-mono text-[10px] font-normal uppercase tracking-[0.1em] text-muted ${index < 2 ? "" : "text-right"}`}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr key={row.wallet} className="border-b border-line last:border-0 hover:bg-surface">
                        <td className="w-10 px-3 py-2.5 font-mono text-[12px] text-muted tnum">{index + 1}</td>
                        <td className="px-3 py-2.5 font-mono text-[12.5px] text-ink">
                          {shortAddress(row.wallet, 6, 6)}
                        </td>
                        <td
                          className={`px-3 py-2.5 text-right font-mono text-[13px] tnum ${row.periodReturn >= 0 ? "text-mint-text" : "text-down"}`}
                        >
                          {row.periodReturn >= 0 ? "+" : ""}
                          {(row.periodReturn * 100).toFixed(2)}%
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-[12.5px] text-ink tnum">
                          {usd(row.equity)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-[12px] text-muted tnum">
                          {row.openPositions}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {isEligible(row.heldAmount) ? (
                            <span className="rounded bg-mint-wash px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-mint-text">
                              eligible
                            </span>
                          ) : (
                            <span className="font-mono text-[11px] text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <ol className="divide-y divide-line md:hidden">
                {rows.map((row, index) => (
                  <li key={row.wallet} className="flex items-center gap-3 px-3 py-3">
                    <span className="w-5 font-mono text-[11px] text-muted tnum">{index + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-[12.5px] text-ink">
                        {shortAddress(row.wallet)}
                      </span>
                      <span className="block font-mono text-[10.5px] text-muted tnum">
                        {usd(row.equity)} · {row.openPositions} open
                        {isEligible(row.heldAmount) ? " · rewards" : ""}
                      </span>
                    </span>
                    <span
                      className={`font-mono text-[14px] tnum ${row.periodReturn >= 0 ? "text-mint-text" : "text-down"}`}
                    >
                      {row.periodReturn >= 0 ? "+" : ""}
                      {(row.periodReturn * 100).toFixed(2)}%
                    </span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </Panel>
      </section>
    </div>
  );
}
