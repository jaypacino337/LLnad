"use client";

import Link from "next/link";
import { useState } from "react";

import { CloneSprite } from "./sprite";
import { Delta } from "./ui";
import { usd } from "@/lib/format";
import { personaFor } from "@/lib/world";

export interface SummonCandidate {
  mint: string;
  symbol: string;
  name: string;
  volume24h: number | null;
  change24h: number | null;
}

const MINT_SHAPE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

type Phase =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "done"; mint: string; symbol: string; already: boolean }
  | { state: "error"; detail: string };

/**
 * Summoning takes one public mint address and nothing else — no wallet
 * connection, no signature, and there is no field for any kind of key.
 */
export function SummonForm({ candidates }: { candidates: SummonCandidate[] }) {
  const [mint, setMint] = useState("");
  const [phase, setPhase] = useState<Phase>({ state: "idle" });

  const trimmed = mint.trim();
  const previewable = MINT_SHAPE.test(trimmed);

  async function summon(address: string) {
    if (phase.state === "submitting") return;
    setPhase({ state: "submitting" });
    try {
      const response = await fetch("/api/summon", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mint: address }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        detail?: string;
        already?: boolean;
        clone?: { mint: string; symbol: string };
      };
      if (!response.ok || !payload.clone) {
        setPhase({ state: "error", detail: payload.detail ?? "The summoning fizzled. Try again." });
        return;
      }
      setPhase({
        state: "done",
        mint: payload.clone.mint,
        symbol: payload.clone.symbol,
        already: payload.already ?? false,
      });
    } catch {
      setPhase({ state: "error", detail: "The network dropped out. Try again." });
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (previewable) void summon(trimmed);
        }}
      >
        <label htmlFor="mint" className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted">
          Token mint address (Solana, public)
        </label>
        <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
          <input
            id="mint"
            name="mint"
            value={mint}
            onChange={(event) => {
              setMint(event.target.value);
              if (phase.state === "error" || phase.state === "done") setPhase({ state: "idle" });
            }}
            placeholder="e.g. 6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN"
            spellCheck={false}
            autoComplete="off"
            className="w-full border border-line-strong bg-bg px-3 py-2.5 font-mono text-[12.5px] text-ink placeholder:text-muted/70"
          />
          <button
            type="submit"
            disabled={!previewable || phase.state === "submitting"}
            className="shrink-0 border border-ink bg-ink px-5 py-2.5 text-[13px] font-semibold text-bg transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {phase.state === "submitting" ? "Summoning…" : "Summon"}
          </button>
        </div>
        {trimmed && !previewable ? (
          <p className="mt-1.5 text-[11.5px] text-muted">
            That is not shaped like a Solana mint address yet.
          </p>
        ) : null}
      </form>

      {previewable && phase.state !== "done" ? (
        <div className="flex items-center gap-4 border border-dashed border-line-strong bg-surface px-4 py-3">
          <CloneSprite mint={trimmed} size={48} />
          <p className="text-[12px] leading-relaxed text-muted">
            This is the body that address gets — looks and personality (
            <span className="text-ink">{personaFor(trimmed).archetype}</span>) are derived from the
            address itself, the same for everyone.
          </p>
        </div>
      ) : null}

      {phase.state === "error" ? (
        <p role="alert" className="border border-down/40 bg-down-wash px-4 py-3 text-[12.5px] text-down">
          {phase.detail}
        </p>
      ) : null}

      {phase.state === "done" ? (
        <div role="status" className="row-in flex items-center gap-4 border border-up/40 bg-up-wash px-4 py-3.5">
          <CloneSprite mint={phase.mint} size={48} />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-ink">
              {phase.already
                ? `$${phase.symbol} already lives here.`
                : `$${phase.symbol} just walked out of the CLONE LAB.`}
            </p>
            <Link href={`/clones/${phase.mint}`} className="text-[12.5px] font-medium text-link-text hover:underline">
              Visit its page →
            </Link>
          </div>
        </div>
      ) : null}

      {candidates.length > 0 ? (
        <div>
          <p className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted">
            Or clone something that is moving right now
          </p>
          <ul className="divide-y divide-line border border-line-strong bg-surface">
            {candidates.map((candidate) => (
              <li key={candidate.mint} className="flex items-center gap-3 px-3.5 py-2.5">
                <CloneSprite mint={candidate.mint} size={26} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-ink">${candidate.symbol}</p>
                  <p className="truncate font-mono text-[10.5px] text-muted tnum">
                    {usd(candidate.volume24h)} 24h · <Delta value={candidate.change24h} className="text-[10.5px]" />
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void summon(candidate.mint)}
                  disabled={phase.state === "submitting"}
                  className="border border-line-strong px-2.5 py-1 text-[11.5px] font-medium text-ink-soft transition hover:border-ink hover:text-ink disabled:opacity-50"
                >
                  Summon
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
