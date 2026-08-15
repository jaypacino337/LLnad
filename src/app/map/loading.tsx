export default function LoadingMap() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <div className="h-8 w-40 rounded bg-raised" />
        <div className="mt-2 h-4 w-72 rounded bg-raised" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div
          className="h-[480px] rounded-xl border border-line bg-surface survey-paper sm:h-[620px]"
          style={{ backgroundSize: "26px 26px" }}
          aria-hidden
        />
        <div className="hidden h-[480px] rounded-xl border border-line bg-surface lg:block" aria-hidden />
      </div>

      <p className="sr-only" role="status">
        Loading the map.
      </p>
    </div>
  );
}
