import Link from "next/link";

/* Shared primitives. Everything composes from one panel, one badge and one
   empty state, so the city keeps a single visual accent: hyperlink cobalt. */

export function SectionHeader({
  title,
  meta,
  action,
  note,
}: {
  title: string;
  meta?: string;
  action?: { label: string; href: string };
  note?: string;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <h2 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h2>
        {meta ? <span className="font-mono text-[11px] text-muted tnum">{meta}</span> : null}
      </div>
      {note ? <p className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">{note}</p> : null}
      {action ? (
        <Link
          href={action.href}
          className="text-[12px] font-medium text-link-text underline-offset-2 transition hover:underline"
        >
          {action.label} →
        </Link>
      ) : null}
    </div>
  );
}

export function Panel({
  children,
  className = "",
  padded = false,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`overflow-hidden border border-line-strong bg-surface ${padded ? "p-4 sm:p-5" : ""} ${className}`}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {children}
    </div>
  );
}

/** Signed percentage: green up, red down, muted when the source had nothing. */
export function Delta({ value, className = "" }: { value: number | null; className?: string }) {
  if (value === null || !Number.isFinite(value)) {
    return <span className={`font-mono text-muted tnum ${className}`}>—</span>;
  }
  const up = value >= 0;
  return (
    <span className={`font-mono tnum ${up ? "text-up" : "text-down"} ${className}`}>
      {up ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "link" | "neutral";
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${
        tone === "link"
          ? "border-link/40 bg-link-wash text-link-text"
          : "border-line-strong bg-surface text-muted"
      }`}
    >
      {children}
    </span>
  );
}

/* --- states --------------------------------------------------------------- */

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="px-5 py-12 text-center">
      <p className="text-[13px] font-medium text-ink">{title}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-[12px] leading-relaxed text-muted">{body}</p>
    </div>
  );
}

/**
 * Shown when the live source cannot be reached. States the source and the
 * reason instead of falling back to placeholder figures.
 */
export function SourceUnavailable({
  source,
  detail,
  compact = false,
}: {
  source: string;
  detail?: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-4">
        <span className="size-1.5 shrink-0 rounded-full bg-down" aria-hidden />
        <span className="text-[12.5px] text-ink">No live data from {source}.</span>
        <span className="text-[11.5px] text-muted">Nothing shown rather than placeholders.</span>
      </div>
    );
  }
  return (
    <div className="px-5 py-10 text-center">
      <span className="inline-flex items-center gap-2 border border-line-strong bg-surface px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
        <span className="size-1.5 rounded-full bg-down" />
        signal lost
      </span>
      <p className="mt-3 text-[13px] font-medium text-ink">No live data from {source}.</p>
      <p className="mx-auto mt-1.5 max-w-md text-[12px] leading-relaxed text-muted">
        The city shows nothing rather than made-up numbers.
        {detail ? ` Upstream said: ${detail}` : ""}
      </p>
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-line" aria-hidden>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex items-center gap-4 px-4 py-3">
          {Array.from({ length: cols }, (_, col) => (
            <div
              key={col}
              className="skeleton h-3"
              style={{ width: col === 0 ? "34%" : `${12 + (col % 3) * 4}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
