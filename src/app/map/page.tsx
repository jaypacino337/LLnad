import type { Metadata } from "next";

import { LandMap } from "@/components/land-map";
import { formatNumber } from "@/lib/format";
import { getStats, listPlots } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Map",
  description: "Pan across the survey, read the deeds, and claim an empty plot.",
};

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ plot?: string }>;
}) {
  const [{ plot }, plots, stats] = await Promise.all([searchParams, listPlots(), getStats()]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-ink sm:text-3xl">The Map</h1>
          <p className="mt-1.5 text-sm text-muted">
            {formatNumber(stats.claimed)} claimed · {formatNumber(stats.available)} still empty.
            Click a square to read its deed or take it.
          </p>
        </div>
      </header>

      <LandMap initialPlots={plots} initialCoord={plot} />
    </div>
  );
}
