import Link from "next/link";

/* Shared primitives. Everything visual composes from these so the product has
   one card, one table and one badge rather than a dozen variants. */

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
      {note ? <p className="text-[11px] text-muted">{note}</p> : null}
      {action ? (
        <Link
          href={action.href}
          className="text-[12px] font-medium text-mint-text transition hover:underline"
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
      className={`overflow-hidden rounded-xl border border-line bg-bg ${padded ? "p-4 sm:p-5" : ""} ${className}`}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {children}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "mint";
}) {
  return (
    <div className="min-w-0 bg-bg px-3.5 py-3">
      <p className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
        {label}
      </p>
      <p
        className={`mt-1 truncate font-mono text-[19px] leading-tight tnum sm:text-[22px] ${
          tone === "mint" ? "text-mint-text" : "text-ink"
        }`}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 truncate text-[11px] text-muted">{hint}</p> : null}
    </div>
  );
}

/** Grid of metric cards separated by hairlines rather than gaps. */
export function MetricGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3 lg:grid-cols-5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {children}
    </div>
  );
}

/** Signed percentage: mint for up, red for down, muted when unknown. */
export function Delta({ value, className = "" }: { value: number | null; className?: string }) {
  if (value === null || !Number.isFinite(value)) {
    return <span className={`font-mono text-muted tnum ${className}`}>—</span>;
  }
  const up = value >= 0;
  return (
    <span
      className={`font-mono tnum ${up ? "text-mint-text" : "text-down"} ${className}`}
    >
      {up ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}

const BADGE_TONES = {
  up: "border-transparent bg-mint-wash text-mint-text",
  down: "border-transparent bg-down-wash text-down",
  neutral: "border-line bg-raised text-ink-soft",
} as const;

export function SignalBadge({
  label,
  tone = "neutral",
  strength,
}: {
  label: string;
  tone?: keyof typeof BADGE_TONES;
  strength?: "low" | "medium" | "high";
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap ${BADGE_TONES[tone]}`}
    >
      {label}
      {strength ? (
        <span aria-label={`strength ${strength}`} className="flex items-end gap-[2px]">
          {[1, 2, 3].map((step) => {
            const filled = strength === "high" ? 3 : strength === "medium" ? 2 : 1;
            return (
              <span
                key={step}
                className="w-[2px] rounded-sm bg-current"
                style={{ height: `${3 + step * 2}px`, opacity: step <= filled ? 1 : 0.25 }}
              />
            );
          })}
        </span>
      ) : null}
    </span>
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "mint" | "neutral";
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${
        tone === "mint" ? "border-mint/40 bg-mint-wash text-mint-text" : "border-line bg-surface text-muted"
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
 * Shown when a live source cannot be reached. States the source and the reason
 * instead of falling back to placeholder rows.
 */
export function SourceUnavailable({
  source,
  detail,
  needs,
  compact = false,
}: {
  source: string;
  detail?: string;
  needs?: string[];
  /** One-line variant, for secondary panels that share a root cause with a
      larger panel already explaining it in full. */
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-4">
        <span className="size-1.5 shrink-0 rounded-full bg-down" aria-hidden />
        <span className="text-[12.5px] text-ink">No live data from {source}.</span>
        {needs && needs.length > 0 ? (
          <span className="font-mono text-[11px] text-muted">needs {needs.join(", ")}</span>
        ) : (
          <span className="text-[11.5px] text-muted">Nothing shown rather than placeholders.</span>
        )}
      </div>
    );
  }

  return (
    <div className="px-5 py-10 text-center">
      <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
        <span className="size-1.5 rounded-full bg-down" />
        Data source unavailable
      </span>
      <p className="mt-3 text-[13px] font-medium text-ink">
        No live data from {source}.
      </p>
      <p className="mx-auto mt-1.5 max-w-md text-[12px] leading-relaxed text-muted">
        Nothing is shown rather than placeholder numbers.
        {detail ? ` Upstream said: ${detail}` : ""}
      </p>
      {needs && needs.length > 0 ? (
        <p className="mx-auto mt-2 max-w-md font-mono text-[11px] text-muted">
          Requires: {needs.join(", ")}
        </p>
      ) : null}
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-line" aria-hidden>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex items-center gap-4 px-4 py-3">
          {Array.from({ length: cols }, (_, col) => (
            <div
              key={col}
              className="skeleton h-3 rounded"
              style={{ width: col === 0 ? "34%" : `${12 + (col % 3) * 4}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function LockedPanel({
  title,
  features,
  requirement,
}: {
  title: string;
  features: readonly string[];
  requirement: string;
}) {
  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3">
        <div className="flex items-center gap-2">
          <LockIcon />
          <h3 className="text-[13px] font-semibold text-ink">{title}</h3>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Pro</span>
      </div>

      <div className="px-4 py-4">
        <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {features.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-[12.5px] text-ink-soft">
              <span className="size-1 shrink-0 rounded-full bg-line-strong" />
              {feature}
            </li>
          ))}
        </ul>
        <p className="mt-4 border-t border-line pt-3 text-[11.5px] text-muted">{requirement}</p>
      </div>
    </Panel>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5 text-muted" aria-hidden fill="none">
      <rect x="3" y="7" width="10" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.6 7V5.4a2.4 2.4 0 0 1 4.8 0V7" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
