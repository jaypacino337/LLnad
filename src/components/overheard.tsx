import type { FeedEntry } from "@/lib/clone-store";
import { timestamp } from "@/lib/format";

const KIND_GLYPH: Record<FeedEntry["kind"], string> = {
  speech: "»",
  summon: "+",
  wake: "☼",
  sleep: "☾",
};

function line(entry: FeedEntry): string {
  switch (entry.kind) {
    case "speech":
      return entry.text ?? "";
    case "summon":
      return `a clone of $${entry.symbol} was summoned into the city`;
    case "wake":
      return `$${entry.symbol} traded again — its clone woke up`;
    case "sleep":
      return `no trades for an hour — $${entry.symbol} walked to THE CACHE to sleep`;
  }
}

/**
 * The city's murmur: speech, summons, and wake/sleep transitions. Speech is
 * generated flavor; the transitions and every quoted figure are live readings.
 */
export function Overheard({ feed, mind }: { feed: FeedEntry[]; mind: "claude" | "rules" }) {
  if (feed.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-[12.5px] text-muted">
        Quiet for now. Speech, summons and wake-ups show up here as they happen.
      </p>
    );
  }
  return (
    <div>
      <ul className="max-h-[420px] divide-y divide-line overflow-y-auto thin-scroll">
        {feed.map((entry) => (
          <li key={`${entry.at}-${entry.mint}-${entry.kind}`} className="row-in flex gap-3 px-4 py-2.5">
            <span className="mt-[1px] w-3 shrink-0 text-center font-mono text-[11px] text-link-text" aria-hidden>
              {KIND_GLYPH[entry.kind]}
            </span>
            <div className="min-w-0">
              <p className="text-[12.5px] leading-snug text-ink">
                {entry.kind === "speech" ? (
                  <>
                    <span className="font-mono text-[11px] font-semibold text-link-text">
                      ${entry.symbol}
                    </span>{" "}
                    {entry.text}
                  </>
                ) : (
                  line(entry)
                )}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-muted tnum">
                {timestamp(entry.at)}
                {entry.kind === "speech" && entry.place ? ` · at ${entry.place}` : ""}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <p className="border-t border-line px-4 py-2 text-[10.5px] text-muted">
        {mind === "claude" ? "Lines written by Claude" : "Lines from the rule bank"} — fiction either
        way, but every figure quoted is a live reading. Not advice.
      </p>
    </div>
  );
}
