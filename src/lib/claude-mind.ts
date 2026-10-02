/**
 * Optional Claude minds.
 *
 * With an ANTHROPIC_API_KEY configured, awake clones get lines written by
 * Claude instead of the rule bank. The prompt hands Claude only the live
 * fields; the reply is then checked — any numeric claim that is not one of
 * those fields disqualifies the line and the grounded rule line runs instead.
 * Without a key (or on any failure) this module quietly returns null.
 */

import { ground } from "./mind";
import type { LiveStats, Persona } from "./world";

const MODEL = "claude-haiku-4-5-20251001";
const TIMEOUT_MS = 6_000;

export function mindMode(): "claude" | "rules" {
  return process.env.ANTHROPIC_API_KEY ? "claude" : "rules";
}

/** Numeric tokens in the text, e.g. "$12.3K", "17", "-4.2%". */
function numericTokens(text: string): string[] {
  return text.match(/\$?\d[\d,.]*\s?[KMB%]?/g) ?? [];
}

/**
 * True when every figure in the line appears among the grounded field values.
 * Bare small integers (≤ 24) pass — "two", "404" the place, "24h" phrasing.
 */
export function isGrounded(text: string, allowed: string[]): boolean {
  const haystack = allowed.join(" | ");
  for (const token of numericTokens(text)) {
    const clean = token.trim();
    if (haystack.includes(clean)) continue;
    const bare = Number.parseFloat(clean.replace(/[$,]/g, ""));
    if (!clean.includes("%") && !clean.startsWith("$") && Number.isFinite(bare) && bare <= 24) continue;
    if (clean === "404") continue;
    return false;
  }
  return true;
}

interface AnthropicReply {
  content?: { type: string; text?: string }[];
}

export async function claudeLine(
  symbol: string,
  persona: Persona,
  stats: LiveStats,
  placeLabel: string,
): Promise<{ text: string; mind: "claude" } | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;

  const g = ground(symbol, stats, placeLabel);
  const facts = [
    `token: ${g.sym}`,
    `1h change: ${g.ch1}`,
    `24h change: ${g.ch24}`,
    `1h volume: ${g.vol1}`,
    `24h volume: ${g.vol24}`,
    `market cap: ${g.mcap}`,
    `liquidity: ${g.liq}`,
    `trades this hour: ${g.trades1} (${g.buys1} buys / ${g.sells1} sells)`,
    `currently at: ${placeLabel}`,
  ].join("\n");

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 80,
        system:
          `You voice a pixel creature in a retro-internet city. It is the living body of the memecoin ${g.sym}. ` +
          `Personality: ${persona.archetype} — ${persona.bio} ` +
          "Write ONE short line (under 140 characters) it says right now, lowercase-casual, wry, old-web nostalgic. " +
          "You may quote ONLY the exact figures provided. Never invent numbers, predictions, or financial advice. " +
          "Reply with the line only.",
        messages: [{ role: "user", content: `Live readings:\n${facts}` }],
      }),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as AnthropicReply;
    const text = payload.content
      ?.filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (!text || text.length > 200) return null;
    const allowed = [g.ch1, g.ch24, g.vol1, g.vol24, g.mcap, g.liq, g.trades1, g.buys1, g.sells1, g.sym];
    if (!isGrounded(text, allowed)) return null;
    return { text, mind: "claude" };
  } catch {
    // Any failure means the caller keeps its grounded rule line.
    return null;
  }
}
