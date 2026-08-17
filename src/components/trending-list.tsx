import { compact, usd } from "@/lib/format";
import { volumeAcceleration, type MarketToken } from "@/lib/market";

import { Delta } from "./ui";

/** Compact momentum board: ranked by how much busier this hour is than usual. */
export function TrendingList({ tokens }: { tokens: MarketToken[] }) {
  return (
    <ol className="divide-y divide-line">
      {tokens.map((token, index) => {
        const acceleration = volumeAcceleration(token);
        return (
          <li key={token.pairAddress} className="row-in px-3.5 py-2.5 hover:bg-surface sm:px-4">
            <a href={token.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3">
              <span className="w-4 shrink-0 font-mono text-[11px] text-muted tnum">
                {index + 1}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-1.5">
                  <span className="truncate text-[13px] font-medium text-ink">{token.symbol}</span>
                  <span className="truncate text-[11px] text-muted">{token.name}</span>
                </span>
                <span className="mt-0.5 flex items-center gap-2 font-mono text-[10.5px] text-muted tnum">
                  <span>vol 1h ${compact(token.volume1h)}</span>
                  <span className="text-mint-text">{acceleration.toFixed(1)}x</span>
                </span>
              </span>

              <span className="shrink-0 text-right">
                <span className="block font-mono text-[12px] text-ink tnum">
                  {usd(token.marketCap)}
                </span>
                <Delta value={token.change1h} className="text-[11px]" />
              </span>
            </a>
          </li>
        );
      })}
    </ol>
  );
}
