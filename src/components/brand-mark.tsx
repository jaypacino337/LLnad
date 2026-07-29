/** A four-plot survey square. Small enough to read at 16px. */
export function BrandMark({ className = "size-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      role="img"
      aria-label="LLNAD"
      fill="none"
      strokeLinecap="square"
    >
      <rect x="1.5" y="1.5" width="21" height="21" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1" fill="var(--accent)" />
    </svg>
  );
}
