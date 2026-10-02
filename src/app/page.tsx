import Link from "next/link";

import { CloneSprite } from "@/components/sprite";
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

export default async function HomePage() {
  const world = await getWorldState();

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
            <h1 className="mt-2 text-[30px] leading-[1.08] font-semibold tracking-tight text-ink sm:text-[44px]">
              Your coin, cloned.
              <br />
              It walks. It talks. It naps.
            </h1>
            <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-ink-soft">
              Paste any live Solana mint and a pixel clone of it moves into the city. Real trading
              volume is its pulse — a busy hour keeps it awake and chatty, a dead hour sends it to
              THE CACHE to sleep. No wallet, no keys, free.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/summon"
                className="border border-ink bg-ink px-4 py-2.5 text-[13.5px] font-semibold text-bg transition hover:opacity-85"
              >
                Summon a clone
              </Link>
              <Link
                href="/how-it-works"
                className="border border-line-strong bg-surface px-4 py-2.5 text-[13.5px] font-medium text-ink transition hover:border-ink"
              >
                How it works
              </Link>
            </div>
          </div>
          <div className="flex items-end gap-3 pb-1" aria-hidden>
            {PARADE.map((mint, index) => (
              <CloneSprite key={mint} mint={mint} size={index === 1 ? 64 : 44} />
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1180px] px-3 py-6 sm:px-5">
        <WorldLive initial={world} />

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
