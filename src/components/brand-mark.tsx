/**
 * PumpXBT agent mark — an original geometric glyph: a hooded silhouette with
 * the capsule motif, built from primitives so it stays crisp at 20px.
 */
export function BrandMark({ className = "size-7" }: { className?: string }) {
  return (
    <span
      className={`relative inline-grid ${className} shrink-0 place-items-center overflow-hidden rounded-[7px] bg-ink`}
      aria-hidden
    >
      <svg viewBox="0 0 28 28" className="size-full">
        {/* hood */}
        <path
          d="M14 5.4c-4.5 0-7.9 3.1-7.9 7.6v9.6h15.8v-9.6c0-4.5-3.4-7.6-7.9-7.6Z"
          fill="var(--mint)"
        />
        {/* face recess */}
        <path
          d="M14 10.6c-2.9 0-5 1.9-5 4.6v7.4h10V15.2c0-2.7-2.1-4.6-5-4.6Z"
          fill="var(--ink)"
        />
        {/* eyes */}
        <circle cx="11.7" cy="16.1" r="1.25" fill="var(--mint)" />
        <circle cx="16.3" cy="16.1" r="1.25" fill="var(--mint)" />
        {/* capsule badge */}
        <rect x="17.4" y="6.1" width="5.6" height="3.1" rx="1.55" fill="#ffffff" />
        <path d="M18.95 6.1h1.55v3.1h-1.55a1.55 1.55 0 0 1 0-3.1Z" fill="var(--mint)" />
      </svg>
    </span>
  );
}

/** Wordmark: "Pump" in ink, "XBT" in mint, matching the brand lockup. */
export function Wordmark({ className = "text-[15px]" }: { className?: string }) {
  return (
    <span className={`font-semibold tracking-tight ${className}`}>
      <span className="text-ink">Pump</span>
      <span className="text-mint-text">XBT</span>
    </span>
  );
}
