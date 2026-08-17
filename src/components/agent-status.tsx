import { age } from "@/lib/format";
import type { SourceStatus } from "@/lib/market";

/** Online only when the last fetch actually returned live data. */
export function AgentStatus({
  status,
  fetchedAt,
  compactLayout = false,
}: {
  status: SourceStatus;
  fetchedAt: string;
  compactLayout?: boolean;
}) {
  const live = status === "live";
  const indexed = age(new Date(fetchedAt).getTime());

  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span className="relative flex size-2 items-center justify-center">
        <span
          className={`size-2 rounded-full ${live ? "bg-mint live-dot" : "bg-down"}`}
        />
      </span>
      <span className="font-mono text-[11px] text-ink-soft">
        {live ? "Agent online" : "Agent degraded"}
      </span>
      {!compactLayout ? (
        <span className="font-mono text-[11px] text-muted tnum">· indexed {indexed} ago</span>
      ) : null}
    </span>
  );
}
