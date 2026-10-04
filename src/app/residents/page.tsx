import type { Metadata } from "next";
import Link from "next/link";

import { Counter, Reveal } from "@/components/motion";
import { BatchPanel, SeatDesk, SweepButton } from "@/components/seat-desk";
import { CloneSprite } from "@/components/sprite";
import { Delta, EmptyState, Panel, SectionHeader } from "@/components/ui";
import { compact, usd } from "@/lib/format";
import { lookupToken, type MarketToken } from "@/lib/market";
import { tokenConfig } from "@/lib/seats/config";
import { publicView, settle, type PublicSeats } from "@/lib/seats/core";
import { shortAddress } from "@/lib/seats/shared";
import { ensureCoin } from "@/lib/seats/store";
import { personaFor } from "@/lib/world";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Residents",
  description:
    "Hold a $CLONE seat and get a resident clone in the city. Claim it with one 𝕏 post bound to your wallet; sell it and you lose it.",
};

/** Seat cells drawn in the map; the rest is summarised as "+N". */
const MAP_CELLS = 180;

type Loaded =
  | { state: "closed"; symbol: string }
  | { state: "error"; symbol: string }
  | { state: "open"; view: PublicSeats; handle: string; market: MarketToken | null };

async function load(): Promise<Loaded> {
  const config = tokenConfig();
  if (!config.ok) return { state: "closed", symbol: "CLONE" };
  try {
    const [coin, market] = await Promise.all([ensureCoin(), lookupToken(config.config.mint)]);
    if (!coin) return { state: "closed", symbol: config.config.symbol };
    settle(coin);
    return { state: "open", view: publicView(coin), handle: config.config.handle, market };
  } catch (error) {
    console.error("residents: seat registry unavailable", error);
    return { state: "error", symbol: config.config.symbol };
  }
}

function Hero({ symbol }: { symbol: string }) {
  const words = ["Hold", "a", "seat.", "Get", "a", "resident."];
  return (
    <section className="relative overflow-hidden border-b border-line-strong">
      <div aria-hidden className="pointer-events-none absolute inset-0 grid-wash opacity-80" />
      <div className="relative mx-auto w-full max-w-[1180px] px-3 pt-9 pb-7 sm:px-5 sm:pt-12">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-link-text">
          ${symbol} guest list
        </p>
        <h1 className="mt-2 max-w-3xl text-[30px] leading-[1.08] font-semibold tracking-tight text-balance text-ink sm:text-[44px]">
          {words.map((word, index) => (
            <span key={index} className="rise-word" style={{ "--i": index } as React.CSSProperties}>
              {word}
              {index < words.length - 1 ? " " : ""}
            </span>
          ))}
        </h1>
        <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-pretty text-ink-soft">
          Anyone can buy ${symbol}. A <em>seat</em> is what makes you a resident: your wallet gets its
          own pixel clone in the city, wearing the cobalt badge, and a place on the roll the rewards
          flywheel pays from. Claim it with one public 𝕏 post. Sell below the minimum and the seat goes
          to the next person in line.
        </p>
      </div>
    </section>
  );
}

const RULES = [
  { title: "One post, bound to you", body: "Your phrase carries a code derived from your wallet. Copying someone else's post gets you nothing." },
  { title: "One seat each", body: "One wallet and one 𝕏 account per seat. Each post works once." },
  { title: "Full? Waitlist", body: "When every seat is taken, claims queue in the order the posts were made." },
  { title: "Sell it, lose it", body: "Anyone can trigger a check: wallets below the minimum hold, read from chain, lose their seat to the waitlist. A failed read never frees a seat." },
  { title: "More seats in batches", body: "The creator can schedule extra seats, authorised by a wallet signature the server verifies." },
];

export default async function ResidentsPage() {
  const data = await load();
  const symbol = data.state === "open" ? data.view.symbol : data.symbol;

  return (
    <>
      <Hero symbol={symbol} />
      <div className="mx-auto w-full max-w-[1180px] px-3 py-7 sm:px-5">
        {data.state === "open" ? <Open data={data} /> : <Closed symbol={symbol} broken={data.state === "error"} />}

        <Reveal as="section" className="mt-10">
          <SectionHeader title="House rules" note="ported from the memcoinz guest list" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {RULES.map((rule, index) => (
              <Reveal key={rule.title} delay={index * 70} className="h-full">
                <div className="lift h-full border border-line-strong bg-surface p-3.5" style={{ boxShadow: "var(--shadow-card)" }}>
                  <p className="text-[13px] font-semibold text-ink">{rule.title}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-muted">{rule.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>

        <p className="mt-10 text-center text-[11.5px] text-muted">
          A seat earns perks, not ownership: anyone can still buy ${symbol} anywhere. Rewards are paid
          only when the flywheel runs, and only to seated wallets.{" "}
          <Link href="/how-it-works" className="text-link-text hover:underline">
            How the city works →
          </Link>
        </p>
      </div>
    </>
  );
}

function Closed({ symbol, broken }: { symbol: string; broken: boolean }) {
  return (
    <Reveal>
      <div className="win">
        <div className="win-title">
          <span className={`size-1.5 rounded-full ${broken ? "bg-down" : "bg-line-strong"}`} />
          seats.exe — {broken ? "registry offline" : "not open"}
        </div>
        <div className="grid items-center gap-6 px-5 py-8 sm:grid-cols-[auto_minmax(0,1fr)]">
          <div className="flex items-end gap-2" aria-hidden>
            {["Seat111111111111111111111111111111111111A", "Seat111111111111111111111111111111111111B", "Seat111111111111111111111111111111111111C"].map(
              (seed, index) => (
                <span key={seed} className="hop" style={{ "--d": `${index * 180}ms` } as React.CSSProperties}>
                  <CloneSprite mint={seed} size={index === 1 ? 52 : 38} asleep />
                </span>
              ),
            )}
          </div>
          <div>
            <p className="text-[15px] font-semibold text-ink">
              {broken ? "The seat registry can't be reached right now." : `Seats open when $${symbol} launches.`}
            </p>
            <p className="mt-1.5 max-w-xl text-[12.5px] leading-relaxed text-muted">
              {broken
                ? "Nothing is shown rather than a stale or made-up list. Try again shortly."
                : `There is no $${symbol} mint yet, so there are no seats, holders or numbers to show, and none are invented. When it goes live, this page becomes the claim desk.`}
            </p>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

function Open({ data }: { data: Extract<Loaded, { state: "open" }> }) {
  const { view, market, handle } = data;
  const free = Math.max(0, view.seatCap - view.seatsTaken);
  const cells = Math.min(view.seatCap, MAP_CELLS);
  const bySeat = new Map(view.seats.map((seat) => [seat.index, seat]));

  return (
    <>
      {/* readings */}
      <Reveal>
        <div className="grid grid-cols-2 gap-px border border-line-strong bg-line-strong sm:grid-cols-4" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="bg-surface px-3.5 py-3">
            <p className="truncate font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted">Residents</p>
            <p className="mt-1 font-mono text-[19px] leading-tight text-ink">
              <Counter value={view.seatsTaken} /> <span className="text-muted">/ {view.seatCap.toLocaleString("en-US")}</span>
            </p>
            <p className="mt-0.5 truncate text-[10.5px] text-muted">{free > 0 ? `${free} seats open` : "full: claims join the waitlist"}</p>
          </div>
          <div className="bg-surface px-3.5 py-3">
            <p className="truncate font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted">Waitlist</p>
            <p className="mt-1 font-mono text-[19px] leading-tight text-ink">
              <Counter value={view.waitlist} />
            </p>
            <p className="mt-0.5 truncate text-[10.5px] text-muted">
              {view.pendingBatch ? `+${view.pendingBatch.count} seats open ${new Date(view.pendingBatch.openAt).toISOString().slice(0, 16).replace("T", " ")} UTC` : "in post order"}
            </p>
          </div>
          <div className="bg-surface px-3.5 py-3">
            <p className="truncate font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted">Hold to keep</p>
            <p className="mt-1 font-mono text-[19px] leading-tight text-ink tnum">{compact(view.minHold)}</p>
            <p className="mt-0.5 truncate text-[10.5px] text-muted">${view.symbol}, checked on chain</p>
          </div>
          <div className="bg-surface px-3.5 py-3">
            <p className="truncate font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted">${view.symbol}</p>
            <p className="mt-1 font-mono text-[19px] leading-tight text-ink tnum">{usd(market?.priceUsd ?? null)}</p>
            <p className="mt-0.5 truncate text-[10.5px] text-muted">
              24h <Delta value={market?.change24h ?? null} className="text-[10.5px]" /> · via Dexscreener
            </p>
          </div>
        </div>
      </Reveal>

      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <Reveal as="section" className="min-w-0">
          <SectionHeader title="Claim your seat" note={`@${handle} on 𝕏`} />
          <Panel padded>
            <SeatDesk symbol={view.symbol} />
          </Panel>
        </Reveal>

        <Reveal as="section" className="min-w-0" delay={90}>
          <SectionHeader title="The seat map" meta={`${view.seatsTaken}/${view.seatCap}`} />
          <div className="win">
            <div className="win-title">cabin.map</div>
            <div className="px-4 py-4">
              <div className="grid grid-cols-12 gap-1" role="img" aria-label={`${view.seatsTaken} of ${view.seatCap} seats taken`}>
                {Array.from({ length: cells }, (_, index) => {
                  const seat = bySeat.get(index);
                  return (
                    <span
                      key={index}
                      className={`seat-cell aspect-square border ${seat ? "border-transparent" : "seat-open border-line-strong bg-bg"}`}
                      style={{ "--i": index, ...(seat ? { background: personaFor(seat.wallet).color } : {}) } as React.CSSProperties}
                      title={seat ? `${seat.label} · ${seat.x === "creator" ? "creator" : `@${seat.x}`}` : "open"}
                    />
                  );
                })}
              </div>
              {view.seatCap > MAP_CELLS ? (
                <p className="mt-2 font-mono text-[10.5px] text-muted">+{(view.seatCap - MAP_CELLS).toLocaleString("en-US")} more seats</p>
              ) : null}
              <div className="mt-4 border-t border-line pt-3">
                <SweepButton />
              </div>
              <div className="mt-3 border-t border-line pt-3">
                <BatchPanel mint={view.mint} creator={view.creator} />
              </div>
            </div>
          </div>
        </Reveal>
      </div>

      <Reveal as="section" className="mt-10">
        <SectionHeader title="The roll" meta={String(view.seatsTaken)} note="every resident, by seat" />
        {view.seats.length === 0 ? (
          <div className="win">
            <EmptyState title="No residents yet" body="The first claimed seat moves its clone into the city." />
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {view.seats.map((seat) => (
              <li
                key={seat.wallet}
                id={seat.wallet}
                className="lift scroll-mt-24 border border-line-strong bg-surface p-3 target:border-link target:bg-link-wash"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <CloneSprite mint={seat.wallet} size={40} />
                  <span className="border border-link/40 bg-link-wash px-1.5 py-0.5 font-mono text-[10px] text-link-text">{seat.label}</span>
                </div>
                <p className="mt-2 truncate text-[12.5px] font-semibold text-ink">
                  {seat.x === "creator" ? "founder" : `@${seat.x}`}
                </p>
                <p className="truncate font-mono text-[10.5px] text-muted">{shortAddress(seat.wallet)}</p>
              </li>
            ))}
          </ul>
        )}
      </Reveal>
    </>
  );
}
