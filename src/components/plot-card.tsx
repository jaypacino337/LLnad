import Link from "next/link";

import { formatDate, prettyUrl } from "@/lib/format";
import { regionName } from "@/lib/land";
import { getColor } from "@/lib/palette";
import type { Plot } from "@/lib/types";

export function PlotGlyph({ plot, size = "size-10" }: { plot: Plot; size?: string }) {
  const color = getColor(plot.color);
  return (
    <span
      aria-hidden
      className={`grid ${size} shrink-0 place-items-center rounded-md font-mono`}
      style={{ backgroundColor: color.hex, color: color.ink }}
    >
      {plot.glyph}
    </span>
  );
}

export function PlotCard({ plot }: { plot: Plot }) {
  return (
    <article className="group relative flex gap-4 rounded-lg border border-line bg-surface p-4 transition hover:border-line-strong">
      <PlotGlyph plot={plot} />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <h3 className="truncate font-medium text-ink">
            <Link href={`/plot/${plot.coord}`} className="hover:underline">
              <span className="absolute inset-0" aria-hidden />
              {plot.title}
            </Link>
          </h3>
          <span className="ml-auto shrink-0 font-mono text-xs text-muted">{plot.coord}</span>
        </div>

        <p className="mt-0.5 font-mono text-xs text-muted">
          @{plot.handle} · {regionName(plot.col, plot.row)}
        </p>

        {plot.bio ? (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{plot.bio}</p>
        ) : null}

        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span>Claimed {formatDate(plot.claimedAt)}</span>
          {plot.url ? (
            <span className="relative z-10 truncate">
              <a
                href={plot.url}
                target="_blank"
                rel="noopener noreferrer nofollow ugc"
                className="text-accent hover:underline"
              >
                {prettyUrl(plot.url)} ↗
              </a>
            </span>
          ) : null}
        </p>
      </div>
    </article>
  );
}
