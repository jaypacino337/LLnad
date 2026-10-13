import Link from "next/link";

import { Marquee, Reveal } from "@/components/motion";
import { CloneSprite } from "@/components/sprite";
import { Delta } from "@/components/ui";
import { WorldLive } from "@/components/world-live";
import { getWorldState } from "@/lib/clone-api";

export const dynamic = "force-dynamic";

/** Sample mints for the hero parade — just deterministic sprites, no data. */
const PARADE = [
  "Bonk111111111111111111111111111111111111pump",
  "Jolt111111111111111111111111111111111111pump",
  "Nova111111111111111111111111111111111111pump",
  "Mint111111111111111111111111111111111111pump",
];

const HEADLINE = ["Your coin, cloned.", "It walks. It talks. It naps."];

export default async function HomePage() {
  const world = await getWorldState();
  const ticker = world.clones.filter((clone) => clone.priced).slice(0, 16);
  const { token } = world;

  return (
    <>
      {/* Hero — short; the city is the point and sits one scroll below. */}
      <section className="relative overflow-hidden border-b border-line-strong">
        <div aria-hidden className="pointer-events-none absolute inset-0 grid-wash opacity-80" />
        <div className="relative mx-auto flex w-full max-w-[1180px] flex-wrap items-end justify-between gap-6 px-3 pt-9 pb-7 sm:px-5 sm:pt-12">
          <div className="min-w-0 max-w-2xl">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-link-text">
              every coin gets a clone
            </p>
            <h1 className="mt-2 text-[30px] leading-[1.08] font-semibold tracking-tight text-balance text-ink sm:text-[44px]">
              {HEADLINE.map((line, row) => (
                <span key={row} className="block">
                  {line.split(" ").map((word, index, words) => (
                    <span
                      key={index}
                      className="rise-word"
                      style={{ "--i": row * 3 + index } as React.CSSProperties}
                    >
                      {word}
                      {index < words.length - 1 ? "\u00a0" : ""}
                    </span>
                  ))}
                </span>
              ))}
            </h1>
            <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-ink-soft">
              Paste any live Solana mint and a pixel clone of it moves into the city. Real trading
              volume is its pulse — a busy hour keeps it awake and chatty, a dead hour sends it to
              THE CACHE to sleep. No wallet, no keys, free.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/summon"
                className="press border border-ink bg-ink px-4 py-2.5 text-[13.5px] font-semibold text-bg transition hover:opacity-85"
              >
                Summon a clone
              </Link>
              <Link
                href="/how-it-works"
                className="press border border-line-strong bg-surface px-4 py-2.5 text-[13.5px] font-medium text-ink transition hover:border-ink"
              >
                How it works
              </Link>
            </div>
          </div>
          <div className="flex items-end gap-3 pb-1" aria-hidden>
            {PARADE.map((mint, index) => (
              <span key={mint} className="hop" style={{ "--d": `${index * 230}ms` } as React.CSSProperties}>
                <CloneSprite mint={mint} size={index === 1 ? 64 : 44} />
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Proof strip: the clones in town right now, with their real 24h move. */}
      {ticker.length > 0 ? (
        <div className="border-b border-line-strong bg-surface py-2">
          <Marquee label="Clones in the city right now">
            {ticker.map((clone) => (
              <span
                key={clone.mint}
                className="mx-4 inline-flex items-center gap-2 font-mono text-[11px] whitespace-nowrap text-ink-soft"
              >
                <CloneSprite mint={clone.mint} size={18} asleep={!clone.awake} />
                {clone.kind === "resident" ? clone.symbol : `$${clone.symbol}`}
                {clone.kind === "resident" ? (
                  <span className="text-link-text">resident</span>
                ) : (
                  <Delta value={clone.stats.change24h} className="text-[11px]" />
                )}
              </span>
            ))}
          </Marquee>
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-[1180px] px-3 py-6 sm:px-5">
        <Reveal>
          <WorldLive initial={world} />
        </Reveal>

        <Reveal as="section" className="mt-10">
          <div className="win">
            <div className="win-title">
              <span className={`size-1.5 rounded-full ${token.open ? "bg-link live-dot" : "bg-line-strong"}`} />
              ${token.symbol} residents
            </div>
            <div className="grid items-center gap-5 px-5 py-6 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div>
                <p className="text-[15px] font-semibold text-ink">
                  Hold a ${token.symbol} seat, get a resident clone.
                </p>
                <p className="mt-1.5 max-w-2xl text-[12.5px] leading-relaxed text-muted">
                  {token.open && token.seatsTaken !== null && token.seatCap !== null
                    ? `${token.seatsTaken} of ${token.seatCap} seats taken. Seat holders walk the city with a cobalt badge and are the wallets the $${token.symbol} rewards flywheel pays.`
                    : `Seats open when $${token.symbol} launches. Seat holders will walk the city with a cobalt badge and be the wallets the rewards flywheel pays.`}
                </p>
              </div>
              <Link
                href="/residents"
                className="press border border-ink bg-ink px-4 py-2.5 text-center text-[13px] font-semibold text-bg transition hover:opacity-85"
              >
                {token.open ? "Claim a seat" : "How seats work"} →
              </Link>
            </div>
          </div>
        </Reveal>

        <p className="mt-10 text-center text-[11.5px] text-muted">
          The city runs on live indexed market data — when the source goes dark, the clones say
          nothing rather than making numbers up.{" "}
          <Link href="/how-it-works" className="text-link-text hover:underline">
            Read the house rules →
          </Link>
        </p>
      </div>
    </>
  );
}
