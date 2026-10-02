import { TableSkeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1180px] px-3 py-8 sm:px-5">
      <div className="skeleton h-4 w-40" />
      <div className="skeleton mt-3 h-9 w-64" />
      <div className="skeleton mt-2 h-5 w-80 max-w-full" />

      <div className="mt-8 grid grid-cols-2 gap-px border border-line-strong bg-line-strong sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="bg-surface px-3.5 py-3">
            <div className="skeleton h-2.5 w-14" />
            <div className="skeleton mt-2 h-5 w-16" />
          </div>
        ))}
      </div>

      <div className="mt-6 border border-line-strong">
        <div className="skeleton h-[280px] w-full" />
      </div>
      <div className="mt-8 border border-line-strong">
        <TableSkeleton rows={6} cols={4} />
      </div>

      <p className="sr-only" role="status">
        Loading the city.
      </p>
    </div>
  );
}
