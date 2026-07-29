import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center px-4 py-28 text-center sm:px-6">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">Off the map</p>
      <h1 className="mt-3 text-3xl font-medium tracking-tight text-ink sm:text-4xl">
        There is no such address.
      </h1>
      <p className="mt-4 leading-relaxed text-muted">
        The survey runs from A1 to BL64 and nothing exists outside it. Head back to the map and pick
        somewhere real.
      </p>
      <Link
        href="/map"
        className="mt-8 rounded-md bg-accent px-5 py-3 text-sm font-semibold text-accent-ink transition hover:opacity-90"
      >
        Back to the map
      </Link>
    </div>
  );
}
