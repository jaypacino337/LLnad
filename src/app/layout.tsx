import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "LLNAD — claim your plot of the web",
    template: "%s · LLNAD",
  },
  description:
    "LLNAD is a 64 by 64 grid of web. Claim a plot, name it, point it at your work, and take your place on the map.",
  keywords: ["llnad", "plot", "map", "grid", "homepage", "builders", "directory"],
  openGraph: {
    title: "LLNAD — claim your plot of the web",
    description:
      "A 64 by 64 grid of web. Claim a plot, name it, point it at your work, and take your place on the map.",
    siteName: "LLNAD",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LLNAD",
    description: "Claim your plot of the web.",
  },
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
    : undefined,
};

/**
 * Applies the stored theme before first paint so the page never flashes the
 * wrong palette. Kept tiny and dependency-free on purpose.
 */
const THEME_BOOTSTRAP = `
(function () {
  try {
    var stored = localStorage.getItem("llnad-theme");
    var theme = stored === "light" || stored === "dark"
      ? stored
      : (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    document.documentElement.setAttribute("data-theme", theme);
  } catch (error) {
    document.documentElement.setAttribute("data-theme", "dark");
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-accent-ink"
        >
          Skip to content
        </a>
        <div className="flex min-h-dvh flex-col">
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
