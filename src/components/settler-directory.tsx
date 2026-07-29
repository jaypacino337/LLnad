"use client";

import { useMemo, useState } from "react";

import { PlotCard } from "@/components/plot-card";
import { regionName } from "@/lib/land";
import { PLOT_COLORS } from "@/lib/palette";
import type { Plot } from "@/lib/types";

type SortKey = "newest" | "oldest" | "address" | "name";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "address", label: "Address" },
  { key: "name", label: "Name" },
];

function sortPlots(plots: Plot[], sort: SortKey): Plot[] {
  const sorted = [...plots];
  switch (sort) {
    case "oldest":
      return sorted.sort((a, b) => a.claimedAt.localeCompare(b.claimedAt));
    case "address":
      return sorted.sort((a, b) => a.col - b.col || a.row - b.row);
    case "name":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "newest":
    default:
      return sorted.sort((a, b) => b.claimedAt.localeCompare(a.claimedAt));
  }
}

export function SettlerDirectory({ plots }: { plots: Plot[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [color, setColor] = useState<string | null>(null);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = plots.filter((plot) => {
      if (color && plot.color !== color) return false;
      if (!needle) return true;
      return (
        plot.title.toLowerCase().includes(needle) ||
        plot.handle.toLowerCase().includes(needle) ||
        plot.coord.toLowerCase().includes(needle) ||
        (plot.bio?.toLowerCase().includes(needle) ?? false) ||
        regionName(plot.col, plot.row).toLowerCase().includes(needle)
      );
    });
    return sortPlots(filtered, sort);
  }, [plots, query, sort, color]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <label htmlFor="settler-search" className="sr-only">
            Search settlers
          </label>
          <input
            id="settler-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, handle, address or region"
            className="w-full rounded-md border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-accent"
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="settler-sort" className="text-xs text-muted">
            Sort
          </label>
          <select
            id="settler-sort"
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            className="rounded-md border border-line bg-surface px-2.5 py-2 text-sm text-ink"
          >
            {SORTS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setColor(null)}
          aria-pressed={color === null}
          className={`rounded-full border px-3 py-1 text-xs transition ${
            color === null ? "border-accent text-ink" : "border-line text-muted hover:text-ink"
          }`}
        >
          All colours
        </button>
        {PLOT_COLORS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setColor(color === option.key ? null : option.key)}
            aria-pressed={color === option.key}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${
              color === option.key ? "border-accent text-ink" : "border-line text-muted hover:text-ink"
            }`}
          >
            <span
              aria-hidden
              className="size-2.5 rounded-full"
              style={{ backgroundColor: option.hex }}
            />
            {option.label}
          </button>
        ))}
      </div>

      <p aria-live="polite" className="mt-6 font-mono text-xs text-muted">
        {results.length} {results.length === 1 ? "plot" : "plots"}
        {query.trim() ? ` matching “${query.trim()}”` : ""}
      </p>

      {results.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-line bg-surface px-5 py-10 text-center text-sm text-muted">
          Nobody here by that description. Try a shorter search.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {results.map((plot) => (
            <PlotCard key={plot.coord} plot={plot} />
          ))}
        </div>
      )}
    </div>
  );
}
