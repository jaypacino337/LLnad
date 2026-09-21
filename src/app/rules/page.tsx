import type { Metadata } from "next";
import Link from "next/link";

import { Panel, SectionHeader } from "@/components/ui";
import { MAX_LEVERAGE, MAX_OPEN_POSITIONS, MIN_MARGIN, STARTING_BALANCE } from "@/lib/game";
import { rewardGate } from "@/lib/player";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rules",
  description: "How the Hood ST paper trading league works.",
};

export default function RulesPage() {
  const gate = rewardGate();

  const RULES = [
    {
      title: "It's paper, and it's honest paper",
      body: `Every wallet gets a $${STARTING_BALANCE.toLocaleString("en-US")} paper balance. No real funds ever move, and no price is ever invented: fills, marks and liquidations all use live indexed prices from the market source. If the source is down, trading pauses rather than simulating.`,
    },
    {
      title: "Positions",
      body: `Long or short any live market with ${MAX_LEVERAGE}x max leverage and isolated margin (minimum $${MIN_MARGIN}, up to ${MAX_OPEN_POSITIONS} open at once). A position liquidates when its loss reaches its margin — at 10x that's a 10% move against you — and loses only that margin. No fees, no funding.`,
    },
    {
      title: "Leagues",
      body: "Daily, weekly and monthly, on UTC boundaries. You're ranked by return over the period — equity now versus your equity when the period started — so joining mid-period costs you nothing. Every account with activity is on the board.",
    },
    {
      title: "Reward eligibility",
      body: gate.configured
        ? `League placement is open to everyone; reward payouts require holding at least ${gate.minHold.toLocaleString("en-US")} ${gate.symbol} in your connected wallet. Your balance is checked on-chain when you sign in and shown as a badge on the board.`
        : `League placement is open to everyone. Reward gating (hold a minimum amount of ${gate.symbol} to qualify for payouts) is built in but not configured yet.`,
    },
    {
      title: "Identity",
      body: "You are your wallet. Signing in means signing a short timestamped message — never a transaction, and never a private key. Nothing on Hood ST asks for a private key; anything that does is a scam.",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[840px] px-3 py-7 sm:px-5">
      <h1 className="text-[26px] font-semibold tracking-tight text-ink sm:text-[32px]">Rules</h1>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
        Five rules, no fine print.
      </p>

      <div className="mt-7 space-y-4">
        {RULES.map((rule, index) => (
          <Panel key={rule.title} padded>
            <div className="flex gap-4">
              <span className="font-mono text-[13px] text-mint-text">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h2 className="text-[15px] font-semibold text-ink">{rule.title}</h2>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{rule.body}</p>
              </div>
            </div>
          </Panel>
        ))}
      </div>

      <section className="mt-10">
        <SectionHeader title="The arithmetic" note="So a liquidation is never a surprise" />
        <Panel padded>
          <ul className="space-y-2 font-mono text-[12px] leading-relaxed text-ink-soft">
            <li>size = margin × leverage ÷ entry price</li>
            <li>pnl (long) = (price − entry) × size, floored at −margin</li>
            <li>pnl (short) = (entry − price) × size, floored at −margin</li>
            <li>liquidation (long) = entry × (1 − 1/leverage)</li>
            <li>liquidation (short) = entry × (1 + 1/leverage)</li>
            <li>equity = free balance + Σ (margin + pnl) over open positions</li>
            <li>league return = equity ÷ equity at period start − 1</li>
          </ul>
        </Panel>
      </section>

      <p className="mt-8 text-center text-[12.5px] text-muted">
        <Link href="/trade" className="font-medium text-mint-text hover:underline">
          Take a position →
        </Link>
      </p>
    </div>
  );
}
