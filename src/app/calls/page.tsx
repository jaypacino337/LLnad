import type { Metadata } from "next";

import { EmptyState, Panel, SectionHeader } from "@/components/ui";
import { timestamp, usd } from "@/lib/format";
import { callMultiple, getCalls } from "@/lib/sources";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Calls",
  description: "PumpXBT call record with entry, peak and current market cap.",
};

export default async function CallsPage() {
  const calls = getCalls();

  return (
    <div className="mx-auto w-full max-w-[1220px] px-3 py-7 sm:px-5">
      <h1 className="text-[26px] font-semibold tracking-tight text-ink sm:text-[32px]">Calls</h1>
      <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-muted">
        Every call is recorded with its entry market cap and tracked afterwards. Wins and losses both
        stay on the record.
      </p>

      <section className="mt-7">
        <SectionHeader title="Track record" meta={calls.length > 0 ? `${calls.length} calls` : undefined} />
        <Panel>
          {calls.length === 0 ? (
            <EmptyState
              title="No verified calls yet"
              body="Nothing has been called. This table stays empty until the first call is published — a track record seeded with entries would be worthless."
            />
          ) : (
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-surface">
                  {["Asset", "Called", "Entry MC", "Current MC", "Peak MC", "Return", "Status"].map(
                    (label, index) => (
                      <th
                        key={label}
                        className={`px-3 py-2 font-mono text-[10px] font-normal uppercase tracking-[0.1em] text-muted ${
                          index === 0 ? "" : "text-right"
                        }`}
                      >
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {calls.map((call) => {
                  const multiple = callMultiple(call);
                  return (
                    <tr key={`${call.tokenAddress}-${call.calledAt}`} className="border-b border-line last:border-0">
                      <td className="px-3 py-2.5 text-[13px] font-medium text-ink">${call.symbol}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-[12px] text-muted tnum">
                        {timestamp(call.calledAt)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[12.5px] text-ink tnum">
                        {usd(call.entryMarketCap)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[12.5px] text-ink tnum">
                        {usd(call.currentMarketCap)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[12.5px] text-ink-soft tnum">
                        {usd(call.peakMarketCap)}
                      </td>
                      <td
                        className={`px-3 py-2.5 text-right font-mono text-[12.5px] tnum ${
                          multiple && multiple >= 1 ? "text-mint-text" : "text-down"
                        }`}
                      >
                        {multiple ? `${multiple.toFixed(2)}x` : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[11px] text-muted">
                        {call.status}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Panel>
      </section>
    </div>
  );
}
