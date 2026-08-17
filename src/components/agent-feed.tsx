import { timestamp } from "@/lib/format";
import { strengthLabel, type Signal } from "@/lib/signals";

import { SignalBadge } from "./ui";

const TONE: Record<Signal["direction"], "up" | "down" | "neutral"> = {
  up: "up",
  down: "down",
  neutral: "neutral",
};

export function AgentFeed({ signals, at }: { signals: Signal[]; at: string }) {
  return (
    <ul className="divide-y divide-line">
      {signals.map((signal) => (
        <li key={signal.id} className="row-in px-3.5 py-3 transition-colors hover:bg-surface sm:px-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] text-muted tnum">{timestamp(at)}</span>
            <SignalBadge
              label={signal.label}
              tone={TONE[signal.direction]}
              strength={strengthLabel(signal.strength)}
            />
            <a
              href={signal.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] font-semibold text-ink hover:underline"
            >
              ${signal.symbol}
            </a>
            <span className="truncate text-[11.5px] text-muted">{signal.name}</span>
          </div>

          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">{signal.observation}</p>

          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
            {signal.inputs.map((input) => (
              <span key={input.label} className="font-mono text-[10.5px] text-muted tnum">
                {input.label} <span className="text-ink-soft">{input.value}</span>
              </span>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
