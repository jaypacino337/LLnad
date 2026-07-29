import type { Metadata } from "next";

import { SettlerDirectory } from "@/components/settler-directory";
import { formatNumber } from "@/lib/format";
import { getStats, listPlots } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settlers",
  description: "Everyone who has claimed a plot on the land, and what they put there.",
};

export default async function SettlersPage() {
  const [plots, stats] = await Promise.all([listPlots(), getStats()]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-medium tracking-tight text-ink sm:text-4xl">Settlers</h1>
        <p className="mt-3 text-base leading-relaxed text-muted">
          {formatNumber(stats.settlers)} people hold {formatNumber(stats.claimed)} plots between
          them. This is everything on the record, newest first.
        </p>
      </header>

      <div className="mt-10">
        <SettlerDirectory plots={plots} />
      </div>
    </div>
  );
}
