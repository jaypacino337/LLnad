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
    console.error("[solanda] page error", error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center px-4 py-28 text-center sm:px-6">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">Survey interrupted</p>
      <h1 className="mt-3 text-3xl font-medium tracking-tight text-ink sm:text-4xl">
        Something went wrong out there.
      </h1>
      <p className="mt-4 leading-relaxed text-muted">
        The land is fine — this page just failed to draw. Try again, and if it keeps happening the
        register may be unreadable.
      </p>
      {error.digest ? (
        <p className="mt-4 font-mono text-xs text-muted">Reference: {error.digest}</p>
      ) : null}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-accent px-5 py-3 text-sm font-semibold text-accent-ink transition hover:opacity-90"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-md border border-line bg-surface px-5 py-3 text-sm text-ink transition hover:border-line-strong"
        >
          Back to the start
        </Link>
      </div>
    </div>
  );
}
