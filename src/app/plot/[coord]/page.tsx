import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PlotCard, PlotGlyph } from "@/components/plot-card";
import { PlotManager } from "@/components/plot-manager";
import { formatDate, prettyUrl } from "@/lib/format";
import { parseCoord, regionName, toCoord } from "@/lib/land";
import { getPlot, listPlots } from "@/lib/store";
import type { Plot } from "@/lib/types";

export const dynamic = "force-dynamic";

interface PlotPageProps {
  params: Promise<{ coord: string }>;
}

export async function generateMetadata({ params }: PlotPageProps): Promise<Metadata> {
  const { coord } = await params;
  const position = parseCoord(coord);
  if (!position) return { title: "Off the map" };

  const canonical = toCoord(position.col, position.row);
  const plot = await getPlot(canonical);

  if (!plot) {
    return {
      title: `${canonical} — unclaimed`,
      description: `Plot ${canonical} in the ${regionName(position.col, position.row)} is still empty.`,
    };
  }

  return {
    title: `${plot.title} (${plot.coord})`,
    description: plot.bio ?? `Plot ${plot.coord}, held by @${plot.handle}.`,
  };
}

/** Plots within one square of this one, for a sense of the neighbourhood. */
function findNeighbours(all: Plot[], col: number, row: number): Plot[] {
  return all
    .filter((plot) => {
      const distance = Math.max(Math.abs(plot.col - col), Math.abs(plot.row - row));
      return distance > 0 && distance <= 2;
    })
    .sort(
      (a, b) =>
        Math.max(Math.abs(a.col - col), Math.abs(a.row - row)) -
        Math.max(Math.abs(b.col - col), Math.abs(b.row - row)),
    )
    .slice(0, 4);
}

export default async function PlotPage({ params }: PlotPageProps) {
  const { coord } = await params;
  const position = parseCoord(coord);
  if (!position) notFound();

  const canonical = toCoord(position.col, position.row);
  const [plot, all] = await Promise.all([getPlot(canonical), listPlots()]);
  const region = regionName(position.col, position.row);
  const neighbours = findNeighbours(all, position.col, position.row);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
      <nav aria-label="Breadcrumb" className="font-mono text-xs text-muted">
        <Link href="/map" className="hover:text-ink">
          The Map
        </Link>
        <span aria-hidden className="px-1.5">
          /
        </span>
        <span className="text-ink">{canonical}</span>
      </nav>

      {plot ? (
        <article className="mt-6">
          <div className="flex flex-wrap items-start gap-5">
            <PlotGlyph plot={plot} size="size-16 text-2xl" />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">{region}</p>
              <h1 className="mt-1.5 text-3xl leading-tight font-medium tracking-tight text-ink sm:text-4xl">
                {plot.title}
              </h1>
              <p className="mt-2 font-mono text-sm text-muted">
                {plot.coord} · held by @{plot.handle} · claimed {formatDate(plot.claimedAt)}
                {plot.updatedAt ? ` · updated ${formatDate(plot.updatedAt)}` : ""}
              </p>
            </div>
          </div>

          {plot.bio ? (
            <p className="mt-8 max-w-2xl border-t border-line pt-8 text-lg leading-relaxed text-muted">
              {plot.bio}
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            {plot.url ? (
              <a
                href={plot.url}
                target="_blank"
                rel="noopener noreferrer nofollow ugc"
                className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink transition hover:opacity-90"
              >
                {prettyUrl(plot.url)} ↗
              </a>
            ) : null}
            <Link
              href={`/map?plot=${plot.coord}`}
              className="rounded-md border border-line bg-surface px-4 py-2.5 text-sm text-ink transition hover:border-line-strong"
            >
              Show on the map
            </Link>
          </div>

          <PlotManager plot={plot} />
        </article>
      ) : (
        <div className="mt-6">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">{region}</p>
          <h1 className="mt-1.5 font-mono text-4xl text-ink sm:text-5xl">{canonical}</h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted">
            This plot is empty. Nobody has recorded a claim on {canonical} yet, which means it is
            available.
          </p>
          <Link
            href={`/map?plot=${canonical}`}
            className="mt-8 inline-block rounded-md bg-accent px-5 py-3 text-sm font-semibold text-accent-ink transition hover:opacity-90"
          >
            Claim {canonical}
          </Link>
        </div>
      )}

      {neighbours.length > 0 ? (
        <section className="mt-16 border-t border-line pt-8">
          <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
            Within two plots
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {neighbours.map((neighbour) => (
              <PlotCard key={neighbour.coord} plot={neighbour} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
