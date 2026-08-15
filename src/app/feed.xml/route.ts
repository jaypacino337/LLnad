import { recentPlots } from "@/lib/store";

export const dynamic = "force-dynamic";

/** XML has five characters that cannot appear raw in text or attributes. */
function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function GET() {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const plots = await recentPlots(40);

  const items = plots
    .map((plot) => {
      const link = `${base}/plot/${plot.coord}`;
      const description = plot.bio
        ? `${plot.bio} — held by @${plot.handle}`
        : `Held by @${plot.handle}.`;

      return [
        "    <item>",
        `      <title>${escapeXml(`${plot.coord} · ${plot.title}`)}</title>`,
        `      <link>${escapeXml(link)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
        `      <pubDate>${new Date(plot.claimedAt).toUTCString()}</pubDate>`,
        `      <description>${escapeXml(description)}</description>`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    "  <channel>",
    "    <title>Solanda — new claims</title>",
    `    <link>${escapeXml(base)}</link>`,
    "    <description>Plots claimed on the map, newest first.</description>",
    "    <language>en</language>",
    items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
