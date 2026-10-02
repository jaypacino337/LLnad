import type { Metadata } from "next";
import Link from "next/link";

import { CloneCard } from "@/components/clone-card";
import { EmptyState, SectionHeader, SourceUnavailable } from "@/components/ui";
import { getWorldState } from "@/lib/clone-api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The clones",
  description: "Everyone who lives in the city right now — wild and summoned.",
};

export default async function ClonesPage() {
  const world = await getWorldState();
  const summoned = world.clones.filter((clone) => clone.kind === "summoned");
  const wild = world.clones.filter((clone) => clone.kind === "wild");

  return (
    <div className="mx-auto w-full max-w-[1180px] px-3 py-8 sm:px-5">
      <h1 className="text-[26px] font-semibold tracking-tight text-ink sm:text-[32px]">The clones</h1>
      <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-muted">
        Everyone in the city right now. Wild clones drift in from the most-traded live markets;
        summoned clones were adopted by a visitor and stay.
      </p>

      {world.status !== "live" && world.clones.length === 0 ? (
        <div className="win mt-7">
          <SourceUnavailable source={world.source} detail={world.error} />
        </div>
      ) : (
        <>
          <section className="mt-8">
            <SectionHeader
              title="Summoned"
              meta={String(summoned.length)}
              action={{ label: "Summon one", href: "/summon" }}
            />
            {summoned.length === 0 ? (
              <div className="win">
                <EmptyState
                  title="Nobody has been summoned yet"
                  body="Paste a mint address on the summon page and its clone moves in — free, no wallet."
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {summoned.map((clone) => (
                  <CloneCard key={clone.mint} clone={clone} />
                ))}
              </div>
            )}
          </section>

          <section className="mt-9">
            <SectionHeader title="Wild" meta={String(wild.length)} note="most-traded live markets" />
            {wild.length === 0 ? (
              <div className="win">
                <EmptyState title="No wild clones" body="The live feed returned no markets this round." />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {wild.map((clone) => (
                  <CloneCard key={clone.mint} clone={clone} />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <p className="mt-10 text-center text-[11.5px] text-muted">
        Want someone specific on this page?{" "}
        <Link href="/summon" className="text-link-text hover:underline">
          Summon them →
        </Link>
      </p>
    </div>
  );
}
