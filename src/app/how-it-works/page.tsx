import type { Metadata } from "next";
import Link from "next/link";

import { Panel, SectionHeader } from "@/components/ui";
import { PLACES } from "@/lib/world";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "How it works",
  description: "Summoning, vitality, speech and the house rules — exactly what is real and what is theater.",
};

const STEPS = [
  {
    number: "01",
    title: "Summon anywhere",
    body: "Paste the public mint address of any Solana token with a live market. That is the whole ritual: no wallet connection, no signature, no fees — and there is no field for a private key, anywhere, ever.",
  },
  {
    number: "02",
    title: "It moves in",
    body: "The clone's pixel body and personality are derived from the address itself, so the same coin always gets the same creature. It picks a favorite spot and starts wandering the city.",
  },
  {
    number: "03",
    title: "Trading is its pulse",
    body: "The city reads each token's real market data every round. A trade in the last hour keeps its clone awake; the energy bar is its actual 24-hour volume on a log scale. Nothing is simulated from thin air.",
  },
  {
    number: "04",
    title: "No trades, it sleeps",
    body: "An hour without a single trade and the clone walks to THE CACHE and lies down. The next real trade wakes it — and it usually has something to say about the gap.",
  },
] as const;

const RULES = [
  "Every price, volume, liquidity, market-cap and trade-count figure on this site is a live reading from the indexed source, or shown as — when the source has nothing. Figures are never invented.",
  "Awake and asleep are not moods: awake means the token really traded in the last hour.",
  "Speech is generated fiction — a deterministic line bank, or Claude when a mind key is configured — and is labeled as such. Any figure inside a line is checked against the same live readings before it prints.",
  "Clones are characters, not signals. Nothing here is financial advice, and a cute sprite is not a reason to buy anything. Memecoins can go to zero.",
  "Summoning never involves a wallet, a signature or any kind of key. The only input this site ever asks for is a public mint address.",
] as const;

export default function HowItWorksPage() {
  return (
    <div className="mx-auto w-full max-w-[1180px] px-3 py-8 sm:px-5">
      <h1 className="text-[26px] font-semibold tracking-tight text-ink sm:text-[32px]">
        A coin with a pulse.
      </h1>
      <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-muted">
        The pulse is real trading volume; the creature is theater. This page says exactly which is
        which.
      </p>

      <section className="mt-8">
        <SectionHeader title="The loop" />
        <div className="grid gap-3 sm:grid-cols-2">
          {STEPS.map((step) => (
            <Panel key={step.number} padded>
              <p className="font-mono text-[11px] text-link-text">{step.number}</p>
              <h3 className="mt-1 text-[15px] font-semibold tracking-tight text-ink">{step.title}</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">{step.body}</p>
            </Panel>
          ))}
        </div>
      </section>

      <section className="mt-9 max-w-3xl">
        <SectionHeader title="The places" note="where clones hang out" />
        <div className="win">
          <div className="win-title">map.txt</div>
          <ul className="grid grid-cols-2 divide-y divide-line sm:grid-cols-3 sm:divide-y-0">
            {PLACES.map((place) => (
              <li key={place.id} className="px-4 py-2.5">
                <p className="font-mono text-[11px] font-semibold tracking-[0.1em] text-ink">{place.label}</p>
                <p className="text-[11px] text-muted">
                  {place.id === "cache"
                    ? "where sleeping clones go"
                    : place.open
                      ? "open plaza"
                      : "hangout"}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-9 max-w-3xl">
        <SectionHeader title="House rules" note="what is real, what is theater" />
        <div className="win">
          <div className="win-title">rules.txt</div>
          <ol className="divide-y divide-line">
            {RULES.map((rule, index) => (
              <li key={rule} className="flex gap-3 px-4 py-3">
                <span className="font-mono text-[11px] text-link-text">{index + 1}.</span>
                <p className="text-[12.5px] leading-relaxed text-ink-soft">{rule}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="mt-10 text-center">
        <Link
          href="/summon"
          className="inline-block border border-ink bg-ink px-5 py-2.5 text-[13.5px] font-semibold text-bg transition hover:opacity-85"
        >
          Give your coin a clone →
        </Link>
      </div>
    </div>
  );
}
