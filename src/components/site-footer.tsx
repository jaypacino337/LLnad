import { BrandMark, Wordmark } from "./brand-mark";

export function SiteFooter({ source }: { source: string }) {
  return (
    <footer className="mt-14 border-t border-line bg-surface">
      <div className="mx-auto flex w-full max-w-[1220px] flex-col gap-3 px-3 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-2">
          <BrandMark className="size-5" />
          <Wordmark className="text-[13px]" />
          <span className="ml-1 text-[11.5px] text-muted">AI intelligence for Pump.fun.</span>
        </div>
        <p className="font-mono text-[11px] text-muted">
          Market data: {source} · Signals: deterministic rules
        </p>
      </div>
    </footer>
  );
}
