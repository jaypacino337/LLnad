"use client";

import { useEffect, useRef, useState } from "react";

/*
 * The motion kit, dependency-free: IntersectionObserver + CSS (globals.css,
 * "motion" section). Everything animates transform/opacity/filter only and
 * collapses to the final state under prefers-reduced-motion.
 */

function useInView<T extends Element>(once = true) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [once]);
  return { ref, inView };
}

/** Fade-up + un-blur when scrolled into view, once. `delay` staggers siblings. */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li";
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={`reveal ${className}`}
      data-in={inView ? "true" : undefined}
      style={{ "--d": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}

/** Integer that counts up when it scrolls into view. Null renders "—". */
export function Counter({ value, className = "" }: { value: number | null; className?: string }) {
  const { ref, inView } = useInView<HTMLSpanElement>();
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!inView || value === null) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    const duration = reduced ? 0 : 700;
    let frame = 0;
    const tick = (now: number) => {
      const t = duration === 0 ? 1 : Math.min(1, (now - start) / duration);
      setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value]);

  return (
    <span ref={ref} className={`tnum ${className}`}>
      {value === null ? "—" : inView ? shown.toLocaleString("en-US") : value.toLocaleString("en-US")}
    </span>
  );
}

/** Infinite ticker that pauses while off-screen. Children render twice for the loop. */
export function Marquee({ children, label }: { children: React.ReactNode; label: string }) {
  const { ref, inView } = useInView<HTMLDivElement>(false);
  return (
    <div ref={ref} className="marquee overflow-hidden" aria-label={label} role="marquee">
      <div className="marquee-track" data-paused={inView ? undefined : "true"}>
        <div className="marquee-set">{children}</div>
        <div className="marquee-set" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
