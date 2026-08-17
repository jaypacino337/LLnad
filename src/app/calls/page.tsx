import type { Metadata } from "next";

import { EmptyState, Panel, SectionHeader } from "@/components/ui";
import { timestamp, usd } from "@/lib/format";
import { callMultiple, getCalls } from "@/lib/calls";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Calls",
  description: "PumpXBT call record with entry, peak and current market cap.",
};

export default async function CallsPage() {
  const calls = await getCalls();

  return (
    <div className="mx-auto w-full max-w-[1220px] px-3 py-7 sm:px-5">
      <h1 className="text-[26px] font-semibold tracking-tight text-ink sm:text-[32px]">Calls</h1>
      <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-muted">
        Every call is recorded with its entry market cap and tracked afterwards. Wins and losses both
        stay on the record.
      </p>

      <section className="mt-7">
        <SectionHeader
          title="Track record"
          meta={calls.length > 0 ? `${calls.length} calls` : undefined}
        />
        <Panel>
          {calls.length === 0 ? (
            <EmptyState
              title="No verified calls yet"
              body="Nothing has been called. This table stays empty until the first call is published — a track record seeded with entries would be worthless."
            />
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block">
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
                        <tr key={call.id} className="border-b border-line last:border-0 hover:bg-surface">
                          <td className="px-3 py-2.5 text-[13px] font-medium text-ink">
                            ${call.symbol}
                          </td>
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
                              multiple === null ? "text-muted" : multiple >= 1 ? "text-mint-text" : "text-down"
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
              </div>

              {/* Mobile */}
              <ul className="divide-y divide-line md:hidden">
                {calls.map((call) => {
                  const multiple = callMultiple(call);
                  return (
                    <li key={call.id} className="px-3 py-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[13px] font-medium text-ink">${call.symbol}</span>
                        <span
                          className={`font-mono text-[13px] tnum ${
                            multiple === null ? "text-muted" : multiple >= 1 ? "text-mint-text" : "text-down"
                          }`}
                        >
                          {multiple ? `${multiple.toFixed(2)}x` : "—"}
                        </span>
                      </div>
                      <dl className="mt-2 grid grid-cols-3 gap-2">
                        {[
                          { label: "Entry", value: usd(call.entryMarketCap) },
                          { label: "Current", value: usd(call.currentMarketCap) },
                          { label: "Peak", value: usd(call.peakMarketCap) },
                        ].map((cell) => (
                          <div key={cell.label}>
                            <dt className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted">
                              {cell.label}
                            </dt>
                            <dd className="font-mono text-[12px] text-ink tnum">{cell.value}</dd>
                          </div>
                        ))}
                      </dl>
                      <p className="mt-1.5 font-mono text-[10.5px] text-muted tnum">
                        {timestamp(call.calledAt)} · {call.status}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Panel>
        <p className="mt-2 text-[11px] leading-relaxed text-muted">
          Calls are published through an operator-only API and refreshed against the market source on
          read. Current and peak market cap stay blank until the source can be reached.
        </p>
      </section>
    </div>
  );
}
