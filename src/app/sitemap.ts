import type { MetadataRoute } from "next";

import { listPlots } from "@/lib/store";

// Regenerated per request so a plot claimed a minute ago is already listed.
export const dynamic = "force-dynamic";

/** Static pages plus one entry per claimed plot. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const plots = await listPlots();

  const pages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/map`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/settlers`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/manifesto`, changeFrequency: "monthly", priority: 0.5 },
  ];

  for (const plot of plots) {
    pages.push({
      url: `${base}/plot/${plot.coord}`,
      lastModified: new Date(plot.claimedAt),
      changeFrequency: "yearly",
      priority: 0.6,
    });
  }

  return pages;
}
