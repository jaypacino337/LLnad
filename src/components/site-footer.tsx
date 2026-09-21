import { BrandMark, Wordmark } from "./brand-mark";

export function SiteFooter({ source }: { source: string }) {
  return (
    <footer className="mt-14 border-t border-line bg-surface">
      <div className="mx-auto flex w-full max-w-[1220px] flex-col gap-3 px-3 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-2">
          <BrandMark className="size-5" />
          <Wordmark className="text-[13px]" />
          <span className="ml-1 text-[11.5px] text-muted">
            Paper trading league on live Pump.fun markets.
          </span>
        </div>
        <p className="font-mono text-[11px] text-muted">
          Prices: {source} · Paper only — nothing here moves real funds
        </p>
      </div>
    </footer>
  );
}
