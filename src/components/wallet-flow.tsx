import { compact, shortAddress, timestamp, usd } from "@/lib/format";
import type { WalletFlowRow } from "@/lib/wallets";

import { SignalBadge } from "./ui";

export function WalletFlowTable({ rows }: { rows: WalletFlowRow[] }) {
  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-surface">
              {["Wallet", "Token", "Action", "Amount", "Value", "Cluster", "Time"].map((label, index) => (
                <th
                  key={label}
                  className={`px-3 py-2 font-mono text-[10px] font-normal uppercase tracking-[0.1em] text-muted ${
                    index === 0 ? "" : "text-right"
                  }`}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.signature} className="row-in border-b border-line last:border-0 hover:bg-surface">
                <td className="px-3 py-2.5 font-mono text-[12px] text-ink">{shortAddress(row.wallet)}</td>
                <td className="px-3 py-2.5 text-right text-[12.5px] font-medium text-ink">
                  {row.symbol ? `$${row.symbol}` : shortAddress(row.mint)}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <SignalBadge label={row.side} tone={row.side === "buy" ? "up" : "down"} />
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-[12px] text-ink-soft tnum">
                  {compact(row.amount)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-[12px] text-ink tnum">
                  {usd(row.valueUsd)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-[12px] text-muted tnum">
                  {row.clusterCount > 1 ? `${row.clusterCount}x` : "—"}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-[11px] text-muted tnum">
                  {timestamp(row.timestampMs)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <ul className="divide-y divide-line md:hidden">
        {rows.map((row) => (
          <li key={row.signature} className="row-in flex items-center gap-3 px-3 py-3">
            <SignalBadge label={row.side} tone={row.side === "buy" ? "up" : "down"} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-ink">
                {row.symbol ? `$${row.symbol}` : shortAddress(row.mint)}
              </span>
              <span className="block font-mono text-[10.5px] text-muted">
                {shortAddress(row.wallet)}
                {row.clusterCount > 1 ? ` · ${row.clusterCount}x` : ""}
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block font-mono text-[12px] text-ink tnum">{usd(row.valueUsd)}</span>
              <span className="block font-mono text-[10.5px] text-muted tnum">
                {timestamp(row.timestampMs)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
