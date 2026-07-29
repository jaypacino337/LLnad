import type { Metadata } from "next";
import Link from "next/link";

import { GRID_COLS, GRID_ROWS, TOTAL_PLOTS } from "@/lib/land";
import { formatNumber } from "@/lib/format";

export const metadata: Metadata = {
  title: "Manifesto",
  description: "Why the land is a fixed grid, what a claim means, and how to read it over the API.",
};

const RULES = [
  {
    title: "The grid does not grow",
    body: `${GRID_COLS} by ${GRID_ROWS} is the whole thing: ${formatNumber(TOTAL_PLOTS)} plots, forever. Scarcity is what makes an address worth having.`,
  },
  {
    title: "One square, one claim",
    body: "A plot holds a name, a mark, a colour, a sentence and a link. That is the entire format. You can hold more than one plot, but each is claimed on its own.",
  },
  {
    title: "Order is chronological, never ranked",
    body: "There is no score, no trending, no promoted plots. The directory sorts by when things happened, and the map by where they are.",
  },
  {
    title: "The record is public",
    body: "Every claim is readable by anyone, over the web or the API. If you would not write it on a signpost, do not write it here.",
  },
];

export default function ManifestoPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <header>
        <h1 className="text-3xl font-medium tracking-tight text-ink sm:text-4xl">Manifesto</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          Most of the web is a feed: infinite, sorted by someone else, gone tomorrow. LLNAD is the
          opposite shape. It is a fixed piece of ground, divided once, where the only thing that
          decides your position is which square you took and when.
        </p>
      </header>

      <section className="mt-14">
        <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-muted">Four rules</h2>
        <div className="mt-6 space-y-8">
          {RULES.map((rule, index) => (
            <div key={rule.title} className="flex gap-5">
              <span className="font-mono text-sm text-accent">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3 className="text-lg font-medium text-ink">{rule.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{rule.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16 border-t border-line pt-10">
        <h2 className="text-2xl font-medium tracking-tight text-ink">On neighbours</h2>
        <p className="mt-4 leading-relaxed text-muted">
          You do not choose who settles next to you, and that is deliberate. A map where everyone
          sorts themselves into tidy groups stops being a map and becomes a filing cabinet. Claim
          near your friends if you like, but expect strangers on the other three sides.
        </p>
        <p className="mt-4 leading-relaxed text-muted">
          Regions are named after where they fall — the North West, the South East, and the middle
          ninth, which is called{" "}
          <Link href="/map" className="text-accent hover:underline">
            the Commons
          </Link>
          . They carry no privileges. A plot in the Commons is worth exactly one plot.
        </p>
      </section>

      <section id="api" className="mt-16 scroll-mt-24 border-t border-line pt-10">
        <h2 className="text-2xl font-medium tracking-tight text-ink">Reading the land</h2>
        <p className="mt-4 leading-relaxed text-muted">
          The whole register is available as JSON with no key and no rate limit on reads. Build your
          own atlas, your own search, your own wall poster.
        </p>

        <dl className="mt-8 space-y-5">
          <Endpoint
            method="GET"
            path="/api/plots"
            body="Every claim, newest first, plus a summary of how much land is left."
          />
          <Endpoint
            method="GET"
            path="/api/plots/AF32"
            body="One address. Returns claimed: false for empty ground, so you can check availability before writing."
          />
          <Endpoint
            method="GET"
            path="/api/stats"
            body="Counts only: total, claimed, available, settlers, and the timestamp of the most recent claim."
          />
          <Endpoint
            method="POST"
            path="/api/plots"
            body="Records a claim. Send coord, title, handle, colour, glyph and optionally url and bio. Returns 409 if the plot is already held."
          />
        </dl>

        <p className="mt-8 text-sm leading-relaxed text-muted">
          Writes are rate limited per client, and a claim cannot be overwritten — the register is
          append-only by design.
        </p>
      </section>

      <div className="mt-16 border-t border-line pt-10">
        <Link
          href="/map"
          className="inline-block rounded-md bg-accent px-5 py-3 text-sm font-semibold text-accent-ink transition hover:opacity-90"
        >
          Go and take a square
        </Link>
      </div>
    </div>
  );
}

function Endpoint({ method, path, body }: { method: string; path: string; body: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <dt className="flex flex-wrap items-center gap-2 font-mono text-sm">
        <span className="rounded bg-raised px-1.5 py-0.5 text-xs text-accent">{method}</span>
        <span className="text-ink">{path}</span>
      </dt>
      <dd className="mt-2 text-sm leading-relaxed text-muted">{body}</dd>
    </div>
  );
}
