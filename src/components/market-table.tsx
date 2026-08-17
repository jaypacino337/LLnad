import { age, compact, usd } from "@/lib/format";
import type { MarketToken } from "@/lib/market";
import { volumeAcceleration } from "@/lib/market";

import { Delta, SignalBadge } from "./ui";

/** Momentum read straight from the fields, so the label always matches the row. */
function momentumBadge(token: MarketToken) {
  const acceleration = volumeAcceleration(token);
  if (acceleration >= 2 && (token.volume1h ?? 0) > 5_000) {
    return <SignalBadge label={`${acceleration.toFixed(1)}x vol`} tone="up" />;
  }
  if ((token.change1h ?? 0) <= -15) return <SignalBadge label="fading" tone="down" />;
  if ((token.change1h ?? 0) >= 15) return <SignalBadge label="rising" tone="up" />;
  return <span className="font-mono text-[11px] text-muted">—</span>;
}

function TokenIdentity({ token }: { token: MarketToken }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span
        aria-hidden
        className="grid size-7 shrink-0 place-items-center rounded-md bg-raised font-mono text-[10px] font-semibold text-ink-soft"
      >
        {token.symbol.slice(0, 3)}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-medium text-ink">{token.symbol}</span>
          {token.isPumpFun ? (
            <span className="shrink-0 rounded bg-mint-wash px-1 py-px font-mono text-[9px] font-semibold uppercase tracking-wide text-mint-text">
              pump
            </span>
          ) : null}
        </span>
        <span className="block truncate text-[11px] text-muted">{token.name}</span>
      </span>
    </div>
  );
}

export function MarketTable({ tokens }: { tokens: MarketToken[] }) {
  return (
    <>
      {/* Desktop / tablet: dense table */}
      <div className="hidden md:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-surface">
              {["Token", "Price", "1h", "24h", "Market cap", "Liquidity", "Vol 24h", "Age", "Momentum"].map(
                (label, index) => (
                  <th
                    key={label}
                    className={`px-3 py-2 font-mono text-[10px] font-normal uppercase tracking-[0.1em] text-muted ${
                      index === 0 ? "" : "text-right"
                    } ${label === "Momentum" ? "text-right" : ""}`}
                  >
                    {label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {tokens.map((token) => (
              <tr
                key={token.pairAddress}
                className="row-in border-b border-line transition-colors last:border-0 hover:bg-surface"
              >
                <td className="max-w-[240px] px-3 py-2.5">
                  <a href={token.url} target="_blank" rel="noopener noreferrer">
                    <TokenIdentity token={token} />
                  </a>
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-[12.5px] text-ink tnum">
                  {usd(token.priceUsd)}
                </td>
                <td className="px-3 py-2.5 text-right text-[12.5px]">
                  <Delta value={token.change1h} />
                </td>
                <td className="px-3 py-2.5 text-right text-[12.5px]">
                  <Delta value={token.change24h} />
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-[12.5px] text-ink tnum">
                  {usd(token.marketCap)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-[12.5px] text-ink-soft tnum">
                  {usd(token.liquidityUsd)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-[12.5px] text-ink-soft tnum">
                  {usd(token.volume24h)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-[12px] text-muted tnum">
                  {age(token.createdAtMs)}
                </td>
                <td className="px-3 py-2.5 text-right">{momentumBadge(token)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked rows, no horizontal scrolling */}
      <ul className="divide-y divide-line md:hidden">
        {tokens.map((token) => (
          <li key={token.pairAddress} className="row-in px-3 py-3">
            <a href={token.url} target="_blank" rel="noopener noreferrer" className="block">
              <div className="flex items-start justify-between gap-3">
                <TokenIdentity token={token} />
                <div className="shrink-0 text-right">
                  <p className="font-mono text-[13px] text-ink tnum">{usd(token.priceUsd)}</p>
                  <Delta value={token.change24h} className="text-[11.5px]" />
                </div>
              </div>

              <dl className="mt-2.5 grid grid-cols-4 gap-2 border-t border-line pt-2">
                {[
                  { label: "MCap", value: usd(token.marketCap) },
                  { label: "Liq", value: usd(token.liquidityUsd) },
                  { label: "Vol 24h", value: compact(token.volume24h) },
                  { label: "Age", value: age(token.createdAtMs) },
                ].map((cell) => (
                  <div key={cell.label} className="min-w-0">
                    <dt className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted">
                      {cell.label}
                    </dt>
                    <dd className="truncate font-mono text-[12px] text-ink tnum">{cell.value}</dd>
                  </div>
                ))}
              </dl>
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}
