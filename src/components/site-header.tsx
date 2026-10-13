"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/", label: "City" },
  { href: "/clones", label: "Clones" },
  { href: "/summon", label: "Summon" },
  { href: "/residents", label: "Residents" },
  { href: "/how-it-works", label: "How it works" },
] as const;

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-mono font-bold tracking-[0.08em] text-ink ${className}`}>
      CLONE
      <span className="blink text-link-text">▮</span>
    </span>
  );
}

export function SiteHeader({ online }: { online: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line-strong bg-bg/95 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-[1180px] items-center gap-5 px-3 py-2.5 sm:px-5">
        <Link href="/" className="flex items-center gap-2" aria-label="CLONE — home">
          <Wordmark className="text-[15px]" />
        </Link>

        <span
          className="inline-flex items-center gap-1.5 border border-line-strong bg-surface px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted"
          title={online ? "Live market data is flowing" : "The live source is unreachable"}
        >
          <span className={`size-1.5 rounded-full ${online ? "bg-up live-dot" : "bg-down"}`} />
          {online ? "live" : "offline"}
        </span>

        <nav className="ml-auto hidden items-center gap-5 sm:flex" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-[13px] transition hover:text-link-text ${
                pathname === item.href ? "font-semibold text-ink underline underline-offset-4" : "text-ink-soft"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/summon"
            className="press border border-ink bg-ink px-3 py-1.5 text-[12.5px] font-semibold text-bg transition hover:opacity-85"
          >
            Summon a clone
          </Link>
        </nav>

        <button
          type="button"
          className="ml-auto border border-line-strong bg-surface px-2.5 py-1 font-mono text-[13px] sm:hidden"
          aria-expanded={open}
          aria-label="Toggle menu"
          onClick={() => setOpen((value) => !value)}
        >
          ≡
        </button>
      </div>

      {open ? (
        <nav className="border-t border-line bg-surface sm:hidden" aria-label="Main mobile">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`block px-4 py-2.5 text-[14px] ${
                pathname === item.href ? "font-semibold text-ink" : "text-ink-soft"
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
