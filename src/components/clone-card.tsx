import Link from "next/link";

import { CloneSprite } from "./sprite";
import { Delta } from "./ui";
import type { CloneView } from "@/lib/clone-api";
import { usd } from "@/lib/format";
import { personaFor } from "@/lib/world";

/**
 * Energy is a reading of real 24h volume on a log scale — the label says so
 * right on the bar, so nobody mistakes it for a simulated stat.
 */
export function EnergyBar({ energy, volume24h }: { energy: number; volume24h: number | null }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted">Energy</span>
        <span className="font-mono text-[10px] text-muted tnum">{usd(volume24h)} / 24h</span>
      </div>
      <div className="mt-1 h-[5px] border border-line-strong bg-surface">
        <div
          className="h-full bg-link"
          style={{ width: `${Math.round(energy * 100)}%` }}
          aria-hidden
        />
      </div>
    </div>
  );
}

export function AwakeDot({ awake }: { awake: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em]">
      <span className={`size-1.5 rounded-full ${awake ? "bg-up live-dot" : "bg-line-strong"}`} />
      <span className={awake ? "text-up" : "text-muted"}>{awake ? "awake" : "asleep"}</span>
    </span>
  );
}

export function CloneCard({ clone }: { clone: CloneView }) {
  const persona = personaFor(clone.mint);
  return (
    <Link
      href={`/clones/${clone.mint}`}
      className="group block border border-line-strong bg-surface p-3.5 transition hover:border-ink"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <CloneSprite mint={clone.mint} size={44} asleep={!clone.awake} />
        <AwakeDot awake={clone.awake} />
      </div>
      <p className="mt-2.5 truncate text-[14px] font-semibold tracking-tight text-ink group-hover:underline">
        ${clone.symbol}
      </p>
      <p className="truncate text-[11px] text-muted">
        {clone.name} · {persona.archetype} · {clone.kind}
      </p>
      <div className="mt-2.5 flex items-center justify-between gap-2 font-mono text-[11px] tnum">
        <span className="text-muted">{clone.priced ? usd(clone.stats.priceUsd) : "no live data"}</span>
        <Delta value={clone.stats.change24h} className="text-[11px]" />
      </div>
      <div className="mt-2.5">
        <EnergyBar energy={clone.energy} volume24h={clone.stats.volume24h} />
      </div>
    </Link>
  );
}
