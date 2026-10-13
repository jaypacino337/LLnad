"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { City } from "./city";
import { AwakeDot, CloneCard, EnergyBar } from "./clone-card";
import { Overheard } from "./overheard";
import { CloneSprite } from "./sprite";
import { Delta, EmptyState, SectionHeader, SourceUnavailable } from "./ui";
import type { CloneView, WorldState } from "@/lib/clone-api";
import { usd } from "@/lib/format";
import { personaFor } from "@/lib/world";

const POLL_MS = 30_000;
/** A speech line hovers over its speaker this long. */
const BUBBLE_MS = 120_000;

function Inspector({ clone, tokenSymbol }: { clone: CloneView; tokenSymbol: string }) {
  const persona = personaFor(clone.mint);
  const resident = clone.kind === "resident";
  return (
    <div className="row-in grid gap-4 border-t border-line-strong bg-surface px-4 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
      <CloneSprite mint={clone.mint} size={64} asleep={!clone.awake} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-[16px] font-semibold tracking-tight text-ink">
            {resident ? clone.symbol : `$${clone.symbol}`}
          </p>
          <AwakeDot awake={clone.awake} />
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
            {persona.archetype} · {resident ? `resident · seat ${clone.seat?.label}` : clone.kind}
          </span>
        </div>
        <p className="mt-1 text-[12px] leading-relaxed text-muted">
          {resident
            ? `Holds a $${tokenSymbol} seat, so it lives here and runs on $${tokenSymbol}'s pulse. Readings below are $${tokenSymbol}'s.`
            : persona.bio}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11.5px] tnum">
          <span className="text-ink">{clone.priced ? usd(clone.stats.priceUsd) : "no live data"}</span>
          <span className="text-muted">
            1h <Delta value={clone.stats.change1h} className="text-[11.5px]" />
          </span>
          <span className="text-muted">
            24h <Delta value={clone.stats.change24h} className="text-[11.5px]" />
          </span>
          <span className="text-muted">mcap {usd(clone.stats.marketCap)}</span>
        </div>
      </div>
      <div className="flex w-full flex-col justify-between gap-3 sm:w-[190px]">
        <EnergyBar energy={clone.energy} volume24h={clone.stats.volume24h} />
        <Link
          href={resident ? `/residents#${clone.mint}` : `/clones/${clone.mint}`}
          className="border border-ink bg-ink px-3 py-1.5 text-center text-[12px] font-semibold text-bg transition hover:opacity-85"
        >
          {resident ? "Resident list" : `Visit $${clone.symbol}`} →
        </Link>
      </div>
    </div>
  );
}

/**
 * Owns the 30-second poll of /api/state and fans the world out to the city,
 * the Overheard feed and the gallery. Walking never waits on the poll — poses
 * are computed client-side from the shared deterministic world.
 */
export function WorldLive({ initial }: { initial: WorldState }) {
  const [world, setWorld] = useState(initial);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const response = await fetch("/api/state", { cache: "no-store" });
        // 503 still carries an honest body (status: unavailable) — render it.
        const payload = (await response.json()) as WorldState;
        if (payload && Array.isArray(payload.clones)) setWorld(payload);
      } catch {
        // Network blip: keep showing the last real state.
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, []);

  const bubble = useMemo(() => {
    const cutoff = Date.parse(world.fetchedAt) - BUBBLE_MS;
    const spoken = world.feed.find(
      (entry) =>
        entry.kind === "speech" &&
        entry.at >= cutoff &&
        entry.text &&
        world.clones.some((clone) => clone.mint === entry.mint),
    );
    return spoken?.text ? { mint: spoken.mint, text: spoken.text } : null;
  }, [world]);

  const live = world.status === "live";
  // Residents share $CLONE's readings, so only token clones count toward totals.
  const tokens = world.clones.filter((clone) => clone.kind !== "resident");
  const residents = world.clones.length - tokens.length;
  const awakeCount = tokens.filter((clone) => clone.awake).length;
  const volume = tokens.reduce((sum, clone) => sum + (clone.stats.volume24h ?? 0), 0);
  const selectedClone = world.clones.find((clone) => clone.mint === selected) ?? null;

  return (
    <div id="world">
      {/* readings strip */}
      <div className="grid grid-cols-2 gap-px border border-line-strong bg-line-strong sm:grid-cols-4" style={{ boxShadow: "var(--shadow-card)" }}>
        {[
          {
            label: "Clones in the city",
            value: String(world.clones.length),
            hint: residents > 0 ? `wild + summoned + ${residents} residents` : "wild + summoned",
          },
          { label: "Awake", value: live ? String(awakeCount) : "—", hint: "traded in the last hour" },
          { label: "Their 24h volume", value: live ? usd(volume) : "—", hint: `via ${world.source}` },
          {
            label: "Minds",
            value: world.mind === "claude" ? "Claude" : "rule bank",
            hint: "speech is generated flavor",
          },
        ].map((cell) => (
          <div key={cell.label} className="bg-surface px-3.5 py-3">
            <p className="truncate font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted">{cell.label}</p>
            <p className="mt-1 truncate font-mono text-[19px] leading-tight text-ink tnum">{cell.value}</p>
            <p className="mt-0.5 truncate text-[10.5px] text-muted">{cell.hint}</p>
          </div>
        ))}
      </div>

      {/* the city */}
      <div className="win mt-6">
        <div className="win-title">
          <span className={`size-1.5 rounded-full ${live ? "bg-up live-dot" : "bg-down"}`} />
          the city — {live ? "live" : "signal lost"}
        </div>
        {world.clones.length === 0 && !live ? (
          <SourceUnavailable source={world.source} detail={world.error} />
        ) : world.clones.length === 0 ? (
          <EmptyState
            title="Nobody lives here yet"
            body="The live feed returned no markets to clone. The moment it does, the city populates itself."
          />
        ) : (
          <>
            <City clones={world.clones} selected={selected} onSelect={setSelected} bubble={bubble} />
            {selectedClone ? (
              <Inspector clone={selectedClone} tokenSymbol={world.token.symbol} />
            ) : (
              <p className="border-t border-line px-4 py-2 text-center font-mono text-[10.5px] text-muted">
                click a clone to see what it is thinking
              </p>
            )}
          </>
        )}
      </div>

      {/* overheard + gallery */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="min-w-0">
          <SectionHeader title="Overheard" note="live murmur" />
          <div className="win">
            <div className="win-title">overheard.log</div>
            <Overheard feed={world.feed} mind={world.mind} />
          </div>
        </section>

        <section className="min-w-0">
          <SectionHeader title="The clones" action={{ label: "All clones", href: "/clones" }} />
          {world.clones.length === 0 ? (
            <div className="win">
              <EmptyState title="Nobody yet" body="Summon the first clone or wait for the feed." />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {world.clones.slice(0, 6).map((clone) => (
                <CloneCard key={clone.mint} clone={clone} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
