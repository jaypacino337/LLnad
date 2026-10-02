import type { Metadata } from "next";

import { SummonForm } from "@/components/summon-form";
import { Panel, SectionHeader, SourceUnavailable } from "@/components/ui";
import { getMarketSnapshot } from "@/lib/market";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Summon",
  description: "Give any live Solana token a clone. Free, no wallet, only a public mint address.",
};

export default async function SummonPage() {
  const snapshot = await getMarketSnapshot();
  const candidates = snapshot.tokens
    .slice()
    .sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0))
    .slice(0, 6)
    .map((token) => ({
      mint: token.tokenAddress,
      symbol: token.symbol,
      name: token.name,
      volume24h: token.volume24h,
      change24h: token.change24h,
    }));

  return (
    <div className="mx-auto w-full max-w-[1180px] px-3 py-8 sm:px-5">
      <h1 className="text-[26px] font-semibold tracking-tight text-ink sm:text-[32px]">
        Summon a clone
      </h1>
      <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-muted">
        One public mint address is the entire ritual. No wallet connection, no signature, and there
        is no field for a private key — anywhere, ever. The token must have a live Solana market:
        clones run on real readings or not at all.
      </p>

      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <section className="min-w-0">
          <SectionHeader title="The ritual" />
          <Panel padded>
            {snapshot.status !== "live" ? (
              <SourceUnavailable source={snapshot.source} detail={snapshot.error} />
            ) : (
              <SummonForm candidates={candidates} />
            )}
          </Panel>
        </section>

        <section className="min-w-0">
          <SectionHeader title="What you get" />
          <div className="win">
            <div className="win-title">readme.txt</div>
            <ul className="divide-y divide-line">
              {[
                {
                  title: "A body",
                  body: "Looks and personality are derived from the mint address itself — deterministic, the same for everyone, forever.",
                },
                {
                  title: "A life on real volume",
                  body: "A trade in the last hour keeps it awake. An hour of silence and it walks to THE CACHE and sleeps until the next trade.",
                },
                {
                  title: "A voice",
                  body: "It talks in the Overheard feed. The words are fiction and labeled as such; every figure it quotes is a live reading.",
                },
                {
                  title: "A page",
                  body: "Its own page with live price, volume and liquidity — or an honest “no live data” when the source goes dark.",
                },
              ].map((item) => (
                <li key={item.title} className="px-4 py-3">
                  <p className="text-[13px] font-semibold text-ink">{item.title}</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
