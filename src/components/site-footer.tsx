/* eslint-disable @next/next/no-html-link-for-pages --
   The links below point at JSON endpoints rather than pages; next/link would
   try to client-navigate to them, which is not what we want here. */
import Link from "next/link";

import { GRID_COLS, GRID_ROWS, TOTAL_PLOTS } from "@/lib/land";
import { formatNumber } from "@/lib/format";

import { BrandMark } from "./brand-mark";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <BrandMark className="size-5 text-ink" />
            <span className="font-mono text-sm font-semibold tracking-[0.22em]">LLNAD</span>
          </div>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
            {GRID_COLS} by {GRID_ROWS} plots, {formatNumber(TOTAL_PLOTS)} in total. One is yours if
            you want it.
          </p>
        </div>

        <nav aria-label="Site" className="text-sm">
          <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-muted">The land</h2>
          <ul className="mt-3 space-y-2">
            <li>
              <Link href="/map" className="text-muted transition hover:text-ink">
                The Map
              </Link>
            </li>
            <li>
              <Link href="/settlers" className="text-muted transition hover:text-ink">
                Settlers
              </Link>
            </li>
            <li>
              <Link href="/manifesto" className="text-muted transition hover:text-ink">
                Manifesto
              </Link>
            </li>
          </ul>
        </nav>

        <div className="text-sm">
          <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-muted">For builders</h2>
          <ul className="mt-3 space-y-2">
            <li>
              <a href="/api/plots" className="text-muted transition hover:text-ink">
                GET /api/plots
              </a>
            </li>
            <li>
              <a href="/api/stats" className="text-muted transition hover:text-ink">
                GET /api/stats
              </a>
            </li>
            <li>
              <Link href="/manifesto#api" className="text-muted transition hover:text-ink">
                API notes
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>An open map. Claim a plot, leave it better than you found it.</p>
          <p className="font-mono">Survey opened 2026</p>
        </div>
      </div>
    </footer>
  );
}
