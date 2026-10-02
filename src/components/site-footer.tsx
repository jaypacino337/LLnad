import Link from "next/link";

import { Wordmark } from "./site-header";

export function SiteFooter({ source }: { source: string }) {
  return (
    <footer className="mt-14 border-t border-line-strong bg-surface">
      <div className="mx-auto w-full max-w-[1180px] px-3 py-6 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Wordmark className="text-[13px]" />
            <span className="text-[11.5px] text-muted">Every coin gets a clone.</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-muted">
            <span>data: {source}</span>
            <Link href="/api/status" className="transition hover:text-link-text">
              status
            </Link>
            <a
              href="https://dexscreener.com/solana"
              target="_blank"
              rel="noreferrer"
              className="transition hover:text-link-text"
            >
              dexscreener ↗
            </a>
          </div>
        </div>
        <p className="mt-4 border-t border-line pt-3 text-[11px] leading-relaxed text-muted">
          Clones are fictional characters attached to real tokens. What they say is generated — not
          advice, not a promise about any coin. Every figure shown is a live reading or absent.
          Summoning is free and never asks for a wallet or any key. Memecoins can go to zero.
        </p>
      </div>
    </footer>
  );
}
