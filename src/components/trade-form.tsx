"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { usd } from "@/lib/format";
import { MAX_LEVERAGE, MIN_MARGIN } from "@/lib/game";

export interface TradeToken {
  tokenAddress: string;
  symbol: string;
  name: string;
  priceUsd: number | null;
}

const FIELD =
  "w-full rounded-md border border-line bg-bg px-3 py-2 font-mono text-[13px] text-ink focus:border-mint-strong";

/**
 * Order ticket. The entry price shown is the live indexed price; the fill
 * happens server-side at the price the source returns at submit time.
 */
export function TradeForm({
  tokens,
  initialToken,
  signedIn,
}: {
  tokens: TradeToken[];
  initialToken?: string;
  signedIn: boolean;
}) {
  const priced = useMemo(() => tokens.filter((token) => (token.priceUsd ?? 0) > 0), [tokens]);
  const [tokenAddress, setTokenAddress] = useState(
    initialToken && priced.some((token) => token.tokenAddress === initialToken)
      ? initialToken
      : (priced[0]?.tokenAddress ?? ""),
  );
  const [side, setSide] = useState<"long" | "short">("long");
  const [margin, setMargin] = useState("100");
  const [leverage, setLeverage] = useState(5);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  const token = priced.find((candidate) => candidate.tokenAddress === tokenAddress) ?? null;
  const marginUsd = Number.parseFloat(margin);
  const validMargin = Number.isFinite(marginUsd) && marginUsd >= MIN_MARGIN;
  const size =
    token?.priceUsd && validMargin ? (marginUsd * leverage) / token.priceUsd : null;
  const liqPrice = token?.priceUsd
    ? side === "long"
      ? token.priceUsd * (1 - 1 / leverage)
      : token.priceUsd * (1 + 1 / leverage)
    : null;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !token) return;
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/trade/open", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tokenAddress: token.tokenAddress,
          symbol: token.symbol,
          side,
          marginUsd,
          leverage,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        detail?: string;
        position?: { entryPrice: number };
      };
      if (!response.ok) {
        setNotice({ tone: "bad", text: payload.detail ?? "Order rejected." });
        return;
      }
      setNotice({
        tone: "ok",
        text: `Filled: ${side} $${token.symbol} · $${marginUsd} × ${leverage}x @ ${usd(payload.position?.entryPrice)}`,
      });
      // The positions panel polls /api/account, so it picks the fill up.
      window.dispatchEvent(new Event("hoodst:account-changed"));
    } catch {
      setNotice({ tone: "bad", text: "The network dropped out. Try again." });
    } finally {
      setBusy(false);
    }
  }

  if (priced.length === 0) {
    return (
      <p className="rounded-lg border border-line bg-surface px-4 py-6 text-center text-[13px] text-muted">
        No live prices right now — orders need a price to fill against, so trading is paused until
        the market source is reachable.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="trade-token" className="block text-xs font-medium text-muted">
          Market
        </label>
        <select
          id="trade-token"
          value={tokenAddress}
          onChange={(event) => setTokenAddress(event.target.value)}
          className={`mt-1.5 ${FIELD}`}
        >
          {priced.map((candidate) => (
            <option key={candidate.tokenAddress} value={candidate.tokenAddress}>
              ${candidate.symbol} — {candidate.name} · {usd(candidate.priceUsd)}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="text-xs font-medium text-muted">Side</legend>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          {(["long", "short"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSide(option)}
              aria-pressed={side === option}
              className={`rounded-md border px-3 py-2 text-[13px] font-semibold capitalize transition ${
                side === option
                  ? option === "long"
                    ? "border-transparent bg-mint text-mint-ink"
                    : "border-transparent bg-down text-white"
                  : "border-line text-muted hover:text-ink"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="trade-margin" className="block text-xs font-medium text-muted">
            Margin (USD)
          </label>
          <input
            id="trade-margin"
            value={margin}
            onChange={(event) => setMargin(event.target.value)}
            inputMode="decimal"
            className={`mt-1.5 ${FIELD}`}
          />
        </div>
        <div>
          <label htmlFor="trade-leverage" className="block text-xs font-medium text-muted">
            Leverage · {leverage}x
          </label>
          <input
            id="trade-leverage"
            type="range"
            min={1}
            max={MAX_LEVERAGE}
            step={1}
            value={leverage}
            onChange={(event) => setLeverage(Number(event.target.value))}
            className="mt-3 w-full accent-(--mint-strong)"
          />
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-2 rounded-lg border border-line bg-surface px-3 py-2.5">
        {[
          { label: "Entry", value: usd(token?.priceUsd) },
          { label: "Size", value: size !== null ? `${size.toLocaleString("en-US", { maximumFractionDigits: 0 })} ${token?.symbol}` : "—" },
          { label: "Liq. price", value: leverage === 1 && side === "long" ? "none" : usd(liqPrice) },
        ].map((cell) => (
          <div key={cell.label} className="min-w-0">
            <dt className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted">
              {cell.label}
            </dt>
            <dd className="truncate font-mono text-[12px] text-ink tnum">{cell.value}</dd>
          </div>
        ))}
      </dl>

      {notice ? (
        <p
          role="alert"
          className={`rounded-md px-3 py-2 text-[12.5px] ${
            notice.tone === "ok" ? "bg-mint-wash text-mint-text" : "bg-down-wash text-down"
          }`}
        >
          {notice.text}
        </p>
      ) : null}

      {signedIn ? (
        <button
          type="submit"
          disabled={busy || !validMargin || !token}
          className="w-full rounded-md bg-ink px-4 py-2.5 text-[13.5px] font-semibold text-bg transition hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Filling…" : `Open ${side} · $${validMargin ? marginUsd : "—"} × ${leverage}x`}
        </button>
      ) : (
        <p className="rounded-md border border-line bg-surface px-3 py-2.5 text-center text-[12.5px] text-muted">
          Connect a wallet (top right) to trade. Paper only — no funds move.
        </p>
      )}

      <p className="text-[11px] leading-relaxed text-muted">
        Fills at the live indexed price, no fees, isolated margin: a {leverage}x position liquidates
        after a {Math.round(100 / leverage)}% move against you and loses only its margin.{" "}
        <Link href="/rules" className="text-mint-text hover:underline">
          Rules →
        </Link>
      </p>
    </form>
  );
}
