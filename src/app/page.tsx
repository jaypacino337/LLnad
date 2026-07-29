import Link from "next/link";

import { Minimap } from "@/components/minimap";
import { PlotCard } from "@/components/plot-card";
import { formatNumber } from "@/lib/format";
import { GRID_COLS, GRID_ROWS } from "@/lib/land";
import { getStats, listPlots, recentPlots } from "@/lib/store";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    step: "01",
    title: "Find an empty square",
    body: "Drag across the survey, zoom in, and look for ground nobody has taken. Every plot has an address like AF32.",
  },
  {
    step: "02",
    title: "Put your name on it",
    body: "Name the plot, pick a colour and a mark, and point it at whatever you want people to see. Takes about a minute.",
  },
  {
    step: "03",
    title: "Send people to the address",
    body: "Your plot gets its own page and shows up in the directory and the public API. It is a place, so use it like one.",
  },
];

const FEATURES = [
  {
    title: "A real address",
    body: "AF32 is shorter than a URL and easier to say out loud. It resolves to your plot page forever.",
  },
  {
    title: "Neighbours",
    body: "Plots sit next to each other. Claim near people you like and the map starts to mean something.",
  },
  {
    title: "No feed, no algorithm",
    body: "Nothing here ranks you. The map shows what exists, in the order it was built.",
  },
  {
    title: "Open data",
    body: "Every claim is readable over a plain JSON API. Build your own view of the land if ours is not to your taste.",
  },
];

export default async function HomePage() {
  const [stats, plots, latest] = await Promise.all([getStats(), listPlots(), recentPlots(4)]);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div aria-hidden className="pointer-events-none absolute inset-0 hero-glow" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 survey-paper"
          style={{ backgroundSize: "26px 26px" }}
        />

        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_auto] lg:py-28">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
              <span aria-hidden className="size-1.5 rounded-full bg-accent" />
              Survey open · {formatNumber(stats.available)} plots left
            </p>

            <h1 className="mt-6 text-4xl leading-[1.05] font-medium tracking-tight text-ink sm:text-6xl">
              Claim your plot
              <br />
              of the web.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
              LLNAD is one map, {GRID_COLS} squares across and {GRID_ROWS} down. Take a square, give
              it a name, and point it at your work. No feed, no ranking — just a place that is yours
              and a set of neighbours you did not pick.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/map"
                className="rounded-md bg-accent px-5 py-3 text-sm font-semibold text-accent-ink transition hover:opacity-90"
              >
                Claim a plot
              </Link>
              <Link
                href="/settlers"
                className="rounded-md border border-line bg-surface px-5 py-3 text-sm font-medium text-ink transition hover:border-line-strong"
              >
                Meet the settlers
              </Link>
            </div>

            <dl className="mt-12 grid max-w-lg grid-cols-3 gap-px overflow-hidden rounded-lg border border-line bg-line">
              <Stat label="Claimed" value={formatNumber(stats.claimed)} />
              <Stat label="Settlers" value={formatNumber(stats.settlers)} />
              <Stat label="Available" value={formatNumber(stats.available)} />
            </dl>
          </div>

          <div className="hidden justify-self-end lg:block">
            <Minimap plots={plots} pixel={6} />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-muted">How it works</h2>
        <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-3">
          {STEPS.map((item) => (
            <div key={item.step} className="bg-surface p-7">
              <span className="font-mono text-sm text-accent">{item.step}</span>
              <h3 className="mt-4 text-lg font-medium text-ink">{item.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-medium tracking-tight text-ink">
              A plot is small on purpose.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted">
              One square, one name, one link. The constraint is the point — it keeps the map legible
              and makes every claim worth something.
            </p>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="border-t border-line pt-5">
                <h3 className="text-base font-medium text-ink">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest claims */}
      <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-muted">Latest claims</h2>
          <Link href="/settlers" className="text-sm text-accent hover:underline">
            All {formatNumber(stats.claimed)} plots →
          </Link>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {latest.map((plot) => (
            <PlotCard key={plot.coord} plot={plot} />
          ))}
        </div>
      </section>

      {/* Closing call */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-4 sm:px-6">
        <div className="relative overflow-hidden rounded-xl border border-line bg-surface px-6 py-14 text-center card-shadow sm:px-12">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 survey-paper"
            style={{ backgroundSize: "26px 26px" }}
          />
          <div className="relative">
            <h2 className="text-2xl font-medium tracking-tight text-ink sm:text-3xl">
              {formatNumber(stats.available)} squares are still empty.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
              Pick one before somebody else does. It costs nothing and takes a minute.
            </p>
            <Link
              href="/map"
              className="mt-7 inline-block rounded-md bg-accent px-5 py-3 text-sm font-semibold text-accent-ink transition hover:opacity-90"
            >
              Open the map
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface px-4 py-4">
      <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">{label}</dt>
      <dd className="mt-1 font-mono text-2xl text-ink">{value}</dd>
    </div>
  );
}
