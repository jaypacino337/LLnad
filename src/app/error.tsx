"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[pumpxbt] page error", error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-md px-4 py-24 text-center">
      <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
        <span className="size-1.5 rounded-full bg-down" />
        Agent error
      </span>
      <h1 className="mt-3 text-[22px] font-semibold tracking-tight text-ink">
        This view failed to render.
      </h1>
      <p className="mt-2 text-[13px] leading-relaxed text-muted">
        The market source may have changed shape or timed out. Retrying is usually enough.
      </p>
      {error.digest ? (
        <p className="mt-3 font-mono text-[11px] text-muted">ref {error.digest}</p>
      ) : null}
      <div className="mt-6 flex justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-ink px-4 py-2 text-[13px] font-semibold text-bg transition hover:opacity-90"
        >
          Retry
        </button>
        <Link
          href="/"
          className="rounded-md border border-line px-4 py-2 text-[13px] text-ink transition hover:border-line-strong"
        >
          Market
        </Link>
      </div>
    </div>
  );
}
