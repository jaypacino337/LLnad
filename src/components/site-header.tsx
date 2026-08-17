"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { BrandMark, Wordmark } from "./brand-mark";

const NAV = [
  { href: "/", label: "Market" },
  { href: "/signals", label: "Signals" },
  { href: "/wallets", label: "Wallets" },
  { href: "/calls", label: "Calls" },
  { href: "/agent", label: "Agent" },
];

export function SiteHeader({ online }: { online: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-[1220px] items-center gap-3 px-3 sm:px-5">
        <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <BrandMark className="size-7" />
          <Wordmark />
        </Link>

        <nav className="ml-3 hidden items-center gap-0.5 md:flex" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`rounded-md px-2.5 py-1.5 text-[13px] transition ${
                isActive(item.href)
                  ? "bg-raised font-medium text-ink"
                  : "text-muted hover:bg-raised hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden items-center gap-1.5 sm:inline-flex">
            <span
              className={`size-1.5 rounded-full ${online ? "bg-mint live-dot" : "bg-down"}`}
              aria-hidden
            />
            <span className="font-mono text-[11px] text-muted">
              {online ? "online" : "degraded"}
            </span>
          </span>

          <Link
            href="/agent#pro"
            className="rounded-md bg-ink px-3 py-1.5 text-[12.5px] font-semibold text-bg transition hover:opacity-90"
          >
            Unlock Pro
          </Link>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label="Menu"
            className="grid size-8 place-items-center rounded-md border border-line text-muted md:hidden"
          >
            <span aria-hidden className="text-[15px] leading-none">
              {open ? "✕" : "≡"}
            </span>
          </button>
        </div>
      </div>

      {open ? (
        <nav className="border-t border-line bg-bg px-3 py-1.5 md:hidden" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`block rounded-md px-2.5 py-2.5 text-[13px] ${
                isActive(item.href) ? "bg-raised font-medium text-ink" : "text-muted"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
