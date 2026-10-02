/**
 * Assembles the world the pages and /api/state serve.
 *
 * Clones come from two doors:
 *  - wild: the most-traded tokens on the live feed drift through the city on
 *    their own, so the place is alive before anyone summons anything;
 *  - summoned: tokens visitors adopted by mint address, persisted in the store.
 *
 * Vitality is read, not simulated: awake/asleep and energy are functions of
 * each token's real last-hour and 24h volume from the market module.
 */

import { cityFeed, recordRound, summonedClones, type FeedEntry } from "./clone-store";
import { claudeLine, mindMode } from "./claude-mind";
import { speechBucket, speechFor, situationFor, type Situation } from "./mind";
import { getMarketSnapshot, tokensByAddress, type MarketToken, type SourceStatus } from "./market";
import { energyFrom, isAwake, moodFrom, personaFor, placeById, poseAt, type LiveStats, type Mood } from "./world";

/** How many live-feed tokens get wild clones. */
export const WILD_COUNT = 8;

export interface CloneView {
  mint: string;
  symbol: string;
  name: string;
  kind: "wild" | "summoned";
  stats: LiveStats;
  /** True when the live source returned data for this token this round. */
  priced: boolean;
  awake: boolean;
  energy: number;
  mood: Mood;
  situation: Situation;
  summonedAt?: string;
  dexUrl: string;
}

export interface WorldState {
  status: SourceStatus;
  source: string;
  error?: string;
  fetchedAt: string;
  clones: CloneView[];
  feed: FeedEntry[];
  mind: "claude" | "rules";
}

function statsOf(token: MarketToken | undefined): { stats: LiveStats; priced: boolean } {
  if (!token) {
    return {
      priced: false,
      stats: {
        priceUsd: null,
        marketCap: null,
        liquidityUsd: null,
        volume1h: null,
        volume24h: null,
        change1h: null,
        change24h: null,
        buys1h: null,
        sells1h: null,
      },
    };
  }
  return {
    priced: true,
    stats: {
      priceUsd: token.priceUsd,
      marketCap: token.marketCap,
      liquidityUsd: token.liquidityUsd,
      volume1h: token.volume1h,
      volume24h: token.volume24h,
      change1h: token.change1h,
      change24h: token.change24h,
      buys1h: token.buys1h,
      sells1h: token.sells1h,
    },
  };
}

/**
 * The current world. Also advances the Overheard feed: awake clones get one
 * line per 10-minute bucket (Claude-written when a key is configured,
 * rule-written otherwise — both grounded in the same live fields).
 */
export async function getWorldState(): Promise<WorldState> {
  const snapshot = await getMarketSnapshot();
  const summoned = summonedClones();

  const wild = snapshot.tokens
    .slice()
    .sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0))
    .filter((token) => !summoned.some((entry) => entry.mint === token.tokenAddress))
    .slice(0, WILD_COUNT);

  // Summoned tokens may have rotated out of the discovery list; price them
  // directly. Tokens already in the snapshot ride along for free.
  const inSnapshot = new Map(snapshot.tokens.map((token) => [token.tokenAddress, token]));
  const missing = summoned.map((entry) => entry.mint).filter((mint) => !inSnapshot.has(mint));
  const fetched = missing.length > 0 ? await tokensByAddress(missing) : new Map<string, MarketToken>();

  const clones: CloneView[] = [];

  for (const token of wild) {
    const { stats, priced } = statsOf(token);
    clones.push({
      mint: token.tokenAddress,
      symbol: token.symbol,
      name: token.name,
      kind: "wild",
      stats,
      priced,
      awake: priced && isAwake(stats),
      energy: energyFrom(stats.volume24h),
      mood: moodFrom(stats.change1h),
      situation: situationFor(stats),
      dexUrl: token.url,
    });
  }

  for (const entry of summoned) {
    const token = inSnapshot.get(entry.mint) ?? fetched.get(entry.mint);
    const { stats, priced } = statsOf(token);
    clones.push({
      mint: entry.mint,
      symbol: token?.symbol ?? entry.symbol,
      name: token?.name ?? entry.name,
      kind: "summoned",
      stats,
      priced,
      awake: priced && isAwake(stats),
      energy: energyFrom(stats.volume24h),
      mood: moodFrom(stats.change1h),
      situation: situationFor(stats),
      summonedAt: entry.summonedAt,
      dexUrl: token?.url ?? `https://dexscreener.com/solana/${entry.mint}`,
    });
  }

  // Speech round: only when the source is live — silent clones beat clones
  // narrating numbers nobody can verify.
  let feed = cityFeed();
  if (snapshot.status === "live") {
    const now = Date.now();
    const bucket = speechBucket(now);
    const candidates = await Promise.all(
      clones
        .filter((clone) => clone.priced)
        .map(async (clone) => {
          const persona = personaFor(clone.mint);
          const place = placeById(poseAt(clone.mint, now, clone.awake).place);
          const fallback = speechFor(clone.mint, clone.symbol, persona, clone.stats, place.label, bucket);
          const upgraded = clone.awake
            ? await claudeLine(clone.symbol, persona, clone.stats, place.label)
            : null;
          return {
            mint: clone.mint,
            symbol: clone.symbol,
            bucket,
            text: upgraded?.text ?? fallback.text,
            place: place.label,
            mind: upgraded?.mind ?? fallback.mind,
            awake: clone.awake,
          };
        }),
    );
    feed = await recordRound(candidates);
  }

  return {
    status: snapshot.status,
    source: snapshot.source,
    error: snapshot.error,
    fetchedAt: snapshot.fetchedAt,
    clones,
    feed: feed.slice(-60).reverse(),
    mind: mindMode(),
  };
}
