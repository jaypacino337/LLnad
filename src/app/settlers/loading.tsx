export default function LoadingSettlers() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
      <div className="h-10 w-48 rounded bg-raised" />
      <div className="mt-3 h-5 w-96 max-w-full rounded bg-raised" />

      <div className="mt-10 h-11 w-full rounded-md border border-line bg-surface" aria-hidden />

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-28 rounded-lg border border-line bg-surface" aria-hidden />
        ))}
      </div>

      <p className="sr-only" role="status">
        Loading the register.
      </p>
    </div>
  );
}
