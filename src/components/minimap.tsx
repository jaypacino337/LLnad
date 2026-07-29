import Link from "next/link";

import { GRID_COLS, GRID_ROWS } from "@/lib/land";
import { getColor } from "@/lib/palette";
import type { Plot } from "@/lib/types";

/**
 * A static, whole-map view for the landing page. Rendered on the server with no
 * interaction beyond a single link through to the real map.
 */
export function Minimap({ plots, pixel = 6 }: { plots: Plot[]; pixel?: number }) {
  return (
    <Link
      href="/map"
      aria-label={`Open the map. ${plots.length} plots claimed so far.`}
      className="group relative block w-fit rounded-lg border border-line bg-surface p-3 transition hover:border-line-strong card-shadow"
    >
      <div
        className="relative survey-paper"
        style={{
          width: GRID_COLS * pixel,
          height: GRID_ROWS * pixel,
          backgroundSize: `${pixel}px ${pixel}px`,
        }}
      >
        <div
          aria-hidden
          className="absolute inset-0 survey-paper-major"
          style={{ backgroundSize: `${pixel * 8}px ${pixel * 8}px` }}
        />
        {plots.map((plot) => (
          <span
            key={plot.coord}
            className="absolute"
            style={{
              left: plot.col * pixel,
              top: plot.row * pixel,
              width: pixel,
              height: pixel,
              backgroundColor: getColor(plot.color).hex,
            }}
          />
        ))}
      </div>

      <span className="mt-3 flex items-center justify-between font-mono text-[11px] text-muted">
        <span>
          A1 – {GRID_COLS}×{GRID_ROWS}
        </span>
        <span className="text-accent opacity-0 transition group-hover:opacity-100">
          Open the map →
        </span>
      </span>
    </Link>
  );
}
