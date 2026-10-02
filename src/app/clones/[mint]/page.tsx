import type { Metadata } from "next";
import Link from "next/link";

import { AwakeDot, EnergyBar } from "@/components/clone-card";
import { Overheard } from "@/components/overheard";
import { CloneSprite } from "@/components/sprite";
import { Delta, SectionHeader } from "@/components/ui";
import { getWorldState, type CloneView } from "@/lib/clone-api";
import { usd } from "@/lib/format";
import { lookupToken } from "@/lib/market";
import { energyFrom, isAwake, moodFrom, personaFor, placeById, poseAt } from "@/lib/world";

export const dynamic = "force-dynamic";

const MINT_SHAPE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ mint: string }>;
}): Promise<Metadata> {
  const { mint } = await params;
  return {
    title: MINT_SHAPE.test(mint) ? `Clone ${mint.slice(0, 4)}…${mint.slice(-4)}` : "Clone",
    description: "One resident of the city: live readings, personality, and what it said lately.",
  };
}

export default async function ClonePage({ params }: { params: Promise<{ mint: string }> }) {
  const { mint } = await params;

  if (!MINT_SHAPE.test(mint)) {
    return <MissingClone title="That is not a Solana mint address." mint={null} />;
  }

  const world = await getWorldState();
  let clone: CloneView | undefined = world.clones.find((entry) => entry.mint === mint);
  let visiting = false;

  if (!clone) {
    // Not a resident — but any token with a live market has a latent clone.
    const token = await lookupToken(mint);
    if (token) {
      visiting = true;
      const stats = {
        priceUsd: token.priceUsd,
        marketCap: token.marketCap,
        liquidityUsd: token.liquidityUsd,
        volume1h: token.volume1h,
        volume24h: token.volume24h,
        change1h: token.change1h,
        change24h: token.change24h,
        buys1h: token.buys1h,
        sells1h: token.sells1h,
      };
      clone = {
        mint,
        symbol: token.symbol,
        name: token.name,
        kind: "wild",
        stats,
        priced: true,
        awake: isAwake(stats),
        energy: energyFrom(stats.volume24h),
        mood: moodFrom(stats.change1h),
        situation: "steady",
        dexUrl: token.url,
      };
    }
  }

  if (!clone) {
    return <MissingClone title="No clone answers to that address." mint={mint} />;
  }

  const persona = personaFor(clone.mint);
  const place = placeById(poseAt(clone.mint, Date.parse(world.fetchedAt), clone.awake).place);
  const lines = world.feed.filter((entry) => entry.mint === clone.mint);

  const readings: { label: string; value: React.ReactNode }[] = [
    { label: "Price", value: <span className="text-ink">{usd(clone.stats.priceUsd)}</span> },
    { label: "1h", value: <Delta value={clone.stats.change1h} /> },
    { label: "24h", value: <Delta value={clone.stats.change24h} /> },
    { label: "Vol 1h", value: <span className="text-ink">{usd(clone.stats.volume1h)}</span> },
    { label: "Vol 24h", value: <span className="text-ink">{usd(clone.stats.volume24h)}</span> },
    { label: "Mcap", value: <span className="text-ink">{usd(clone.stats.marketCap)}</span> },
    { label: "Liquidity", value: <span className="text-ink">{usd(clone.stats.liquidityUsd)}</span> },
    {
      label: "Trades 1h",
      value: (
        <span className="text-ink">
          {(clone.stats.buys1h ?? 0) + (clone.stats.sells1h ?? 0)}
        </span>
      ),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1180px] px-3 py-8 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex min-w-0 items-start gap-5">
          <div className="border border-line-strong bg-surface p-3" style={{ boxShadow: "var(--shadow-card)" }}>
            <CloneSprite mint={clone.mint} size={88} asleep={!clone.awake} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="text-[26px] font-semibold tracking-tight text-ink sm:text-[32px]">
                ${clone.symbol}
              </h1>
              <AwakeDot awake={clone.awake} />
            </div>
            <p className="mt-0.5 text-[13px] text-muted">
              {clone.name} · <span className="font-mono text-[11.5px]">{persona.archetype}</span> ·{" "}
              {visiting ? "visiting" : clone.kind}
              {clone.awake ? (
                <>
                  {" "}
                  · currently at <span className="font-mono text-[11.5px]">{place.label}</span>
                </>
              ) : (
                <>
                  {" "}
                  · sleeping at <span className="font-mono text-[11.5px]">THE CACHE</span>
                </>
              )}
            </p>
            <p className="mt-2 max-w-md text-[12.5px] leading-relaxed text-ink-soft">
              {persona.bio}{" "}
              <span className="text-muted">(Personality is derived from the address — generated, not advice.)</span>
            </p>
            <p className="mt-2 font-mono text-[10.5px] break-all text-muted">{clone.mint}</p>
          </div>
        </div>
        <div className="flex w-full max-w-[240px] flex-col gap-3">
          <EnergyBar energy={clone.energy} volume24h={clone.stats.volume24h} />
          {visiting ? (
            <Link
              href="/summon"
              className="border border-ink bg-ink px-3 py-2 text-center text-[12.5px] font-semibold text-bg transition hover:opacity-85"
            >
              Summon it for real →
            </Link>
          ) : null}
          <a
            href={clone.dexUrl}
            target="_blank"
            rel="noreferrer"
            className="border border-line-strong bg-surface px-3 py-2 text-center text-[12.5px] font-medium text-ink transition hover:border-ink"
          >
            Chart on Dexscreener ↗
          </a>
        </div>
      </div>

      <section className="mt-8">
        <SectionHeader title="Live readings" note={world.status === "live" ? "live" : "signal lost"} />
        <div
          className="grid grid-cols-2 gap-px border border-line-strong bg-line-strong sm:grid-cols-4"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          {readings.map((cell) => (
            <div key={cell.label} className="bg-surface px-3.5 py-3">
              <p className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted">{cell.label}</p>
              <p className="mt-1 font-mono text-[16px] tnum">{cell.value}</p>
            </div>
          ))}
        </div>
        {!clone.priced ? (
          <p className="mt-2 text-[11.5px] text-muted">
            The source has no live data for this token right now, so every reading shows — instead of
            a guess.
          </p>
        ) : null}
      </section>

      <section className="mt-8 max-w-2xl">
        <SectionHeader title="Recently said" note="generated flavor, live figures" />
        <div className="win">
          <div className="win-title">{clone.symbol.toLowerCase()}.log</div>
          {lines.length === 0 ? (
            <p className="px-4 py-8 text-center text-[12.5px] text-muted">
              Nothing on the record yet.{" "}
              {visiting ? "Visitors don't speak — summoned residents do." : "Lines land every few minutes while it is awake."}
            </p>
          ) : (
            <Overheard feed={lines} mind={world.mind} />
          )}
        </div>
      </section>
    </div>
  );
}

function MissingClone({ title, mint }: { title: string; mint: string | null }) {
  return (
    <div className="mx-auto w-full max-w-[1180px] px-3 py-16 text-center sm:px-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">404 field</p>
      <h1 className="mt-2 text-[24px] font-semibold tracking-tight text-ink">{title}</h1>
      <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-muted">
        {mint
          ? "No live Solana market was found for it, and nobody has summoned it. Clones need real readings to live on."
          : "Check the address and try again."}
      </p>
      <Link
        href="/summon"
        className="mt-5 inline-block border border-ink bg-ink px-4 py-2 text-[13px] font-semibold text-bg transition hover:opacity-85"
      >
        Try a summon →
      </Link>
    </div>
  );
}
