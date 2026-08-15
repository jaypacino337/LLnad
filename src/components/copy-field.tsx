"use client";

import { useEffect, useState } from "react";

/** A read-only value with a copy button, plus a manual-selection fallback. */
export function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard blocked (insecure origin, or the user said no). The value is
      // selectable in the field either way, so there is nothing to recover.
    }
  }

  return (
    <div className="flex items-stretch gap-2">
      <input
        readOnly
        value={value}
        aria-label={label}
        onFocus={(event) => event.currentTarget.select()}
        className="min-w-0 flex-1 rounded-md border border-line bg-bg px-3 py-2 font-mono text-sm text-ink"
      />
      <button
        type="button"
        onClick={copy}
        className="shrink-0 rounded-md border border-line px-3 py-2 text-xs text-muted transition hover:text-ink"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
