import { TableSkeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1220px] px-3 py-8 sm:px-5">
      <div className="skeleton h-6 w-24 rounded-full" />
      <div className="skeleton mt-4 h-9 w-44 rounded" />
      <div className="skeleton mt-2 h-5 w-64 rounded" />

      <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="bg-bg px-3.5 py-3">
            <div className="skeleton h-2.5 w-14 rounded" />
            <div className="skeleton mt-2 h-5 w-16 rounded" />
          </div>
        ))}
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-line">
        <TableSkeleton rows={7} cols={6} />
      </div>

      <p className="sr-only" role="status">
        Loading market data.
      </p>
    </div>
  );
}
