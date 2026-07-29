"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { BrandMark } from "./brand-mark";
import { ThemeToggle } from "./theme-toggle";

const LINKS = [
  { href: "/map", label: "The Map" },
  { href: "/settlers", label: "Settlers" },
  { href: "/manifesto", label: "Manifesto" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-ink"
          onClick={() => setOpen(false)}
        >
          <BrandMark className="size-6 text-ink" />
          <span className="font-mono text-base font-semibold tracking-[0.22em]">LLNAD</span>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Main">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={`rounded-md px-3 py-2 text-sm transition ${
                isActive(link.href)
                  ? "bg-raised text-ink"
                  : "text-muted hover:bg-raised hover:text-ink"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <ThemeToggle />
          <Link
            href="/map"
            className="hidden rounded-md bg-accent px-3.5 py-2 text-sm font-semibold text-accent-ink transition hover:opacity-90 sm:block"
          >
            Claim a plot
          </Link>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label="Menu"
            className="grid size-9 place-items-center rounded-md border border-line bg-surface text-muted md:hidden"
          >
            <span aria-hidden className="text-base leading-none">
              {open ? "✕" : "≡"}
            </span>
          </button>
        </div>
      </div>

      {open ? (
        <nav
          id="mobile-nav"
          aria-label="Main"
          className="border-t border-line bg-surface px-4 py-2 md:hidden"
        >
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={`block rounded-md px-3 py-2.5 text-sm ${
                isActive(link.href) ? "bg-raised text-ink" : "text-muted"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
