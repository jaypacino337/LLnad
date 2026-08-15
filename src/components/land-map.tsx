"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { formatDate, prettyUrl } from "@/lib/format";
import {
  CELL_SIZE,
  GRID_COLS,
  GRID_ROWS,
  columnLabel,
  isInBounds,
  parseCoord,
  regionName,
  toCoord,
} from "@/lib/land";
import { getColor } from "@/lib/palette";
import type { Plot } from "@/lib/types";

import { ClaimForm } from "./claim-form";
import { CopyField } from "./copy-field";

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 3.2;
/** Pointer travel, in px, past which a press counts as a pan rather than a click. */
const DRAG_SLOP = 5;
/** A heavier rule every N plots, so the eye can count across the map. */
const MAJOR_EVERY = 8;

interface Cell {
  col: number;
  row: number;
}

interface LandMapProps {
  initialPlots: Plot[];
  /** Address to open on first render, e.g. from ?plot=AF32. */
  initialCoord?: string;
}

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

export function LandMap({ initialPlots, initialCoord }: LandMapProps) {
  const [plots, setPlots] = useState<Plot[]>(initialPlots);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [cursor, setCursor] = useState<Cell | null>(null);
  const [selected, setSelected] = useState<Cell | null>(() => {
    if (!initialCoord) return null;
    return parseCoord(initialCoord);
  });
  const [justClaimed, setJustClaimed] = useState<{ plot: Plot; claimKey: string } | null>(null);
  const [jumpValue, setJumpValue] = useState("");
  const [jumpError, setJumpError] = useState<string | null>(null);
  /** Mirrors the drag ref so the cursor style can change during a pan. */
  const [panning, setPanning] = useState(false);

  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);

  const byCoord = useMemo(() => {
    const map = new Map<string, Plot>();
    for (const plot of plots) map.set(plot.coord, plot);
    return map;
  }, [plots]);

  const cell = CELL_SIZE * zoom;
  const surfaceWidth = GRID_COLS * cell;
  const surfaceHeight = GRID_ROWS * cell;

  const selectedCoord = selected ? toCoord(selected.col, selected.row) : null;
  const selectedPlot = selectedCoord ? (byCoord.get(selectedCoord) ?? null) : null;
  const hoveredCoord = cursor ? toCoord(cursor.col, cursor.row) : null;
  const hoveredPlot = hoveredCoord ? (byCoord.get(hoveredCoord) ?? null) : null;

  /** Put a plot in the middle of the viewport at the given zoom. */
  const centerOn = useCallback((target: Cell, atZoom: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const { width, height } = viewport.getBoundingClientRect();
    const size = CELL_SIZE * atZoom;
    setPan({
      x: width / 2 - (target.col + 0.5) * size,
      y: height / 2 - (target.row + 0.5) * size,
    });
  }, []);

  // Open on the busiest part of the map — or on the requested plot.
  useLayoutEffect(() => {
    const focus =
      selected ??
      (() => {
        if (plots.length === 0) return { col: GRID_COLS / 2, row: GRID_ROWS / 2 };
        const sum = plots.reduce(
          (acc, plot) => ({ col: acc.col + plot.col, row: acc.row + plot.row }),
          { col: 0, row: 0 },
        );
        return {
          col: Math.round(sum.col / plots.length),
          row: Math.round(sum.row / plots.length),
        };
      })();
    centerOn(focus, 1);
    // Only on mount: afterwards the user owns the viewport.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cellFromEvent = useCallback(
    (clientX: number, clientY: number): Cell | null => {
      const viewport = viewportRef.current;
      if (!viewport) return null;
      const rect = viewport.getBoundingClientRect();
      const col = Math.floor((clientX - rect.left - pan.x) / cell);
      const row = Math.floor((clientY - rect.top - pan.y) / cell);
      return isInBounds(col, row) ? { col, row } : null;
    },
    [cell, pan.x, pan.y],
  );

  /** Zoom about a fixed point so the plot under the cursor stays put. */
  const zoomAt = useCallback(
    (factor: number, anchorX: number, anchorY: number) => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const rect = viewport.getBoundingClientRect();
      const localX = anchorX - rect.left;
      const localY = anchorY - rect.top;

      setZoom((currentZoom) => {
        const nextZoom = clampZoom(currentZoom * factor);
        if (nextZoom === currentZoom) return currentZoom;
        const ratio = nextZoom / currentZoom;
        setPan((currentPan) => ({
          x: localX - (localX - currentPan.x) * ratio,
          y: localY - (localY - currentPan.y) * ratio,
        }));
        return nextZoom;
      });
    },
    [],
  );

  /** Zoom from the middle, for the toolbar buttons and keyboard. */
  const zoomFromCentre = useCallback(
    (factor: number) => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const rect = viewport.getBoundingClientRect();
      zoomAt(factor, rect.left + rect.width / 2, rect.top + rect.height / 2);
    },
    [zoomAt],
  );

  // Wheel has to be a manual listener: React attaches it passively, which means
  // preventDefault() there is ignored and the whole page scrolls instead.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    function onWheel(event: WheelEvent) {
      event.preventDefault();
      const step = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
      zoomAt(Math.exp(-step * 0.0016), event.clientX, event.clientY);
    }

    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y,
      moved: false,
    };
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      setCursor(cellFromEvent(event.clientX, event.clientY));
      return;
    }

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) > DRAG_SLOP) {
      drag.moved = true;
      setPanning(true);
    }
    if (drag.moved) setPan({ x: drag.originX + dx, y: drag.originY + dy });
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    dragRef.current = null;
    setPanning(false);
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (!drag.moved) {
      const hit = cellFromEvent(event.clientX, event.clientY);
      if (hit) {
        setSelected(hit);
        setJustClaimed(null);
      }
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? MAJOR_EVERY : 1;
    const base = cursor ?? selected ?? { col: 0, row: 0 };
    let next: Cell | null = null;

    switch (event.key) {
      case "ArrowUp":
        next = { col: base.col, row: base.row - step };
        break;
      case "ArrowDown":
        next = { col: base.col, row: base.row + step };
        break;
      case "ArrowLeft":
        next = { col: base.col - step, row: base.row };
        break;
      case "ArrowRight":
        next = { col: base.col + step, row: base.row };
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (cursor) {
          setSelected(cursor);
          setJustClaimed(null);
        }
        return;
      case "+":
      case "=":
        event.preventDefault();
        zoomFromCentre(1.25);
        return;
      case "-":
        event.preventDefault();
        zoomFromCentre(0.8);
        return;
      default:
        return;
    }

    event.preventDefault();
    const clamped = {
      col: Math.min(GRID_COLS - 1, Math.max(0, next.col)),
      row: Math.min(GRID_ROWS - 1, Math.max(0, next.row)),
    };
    setCursor(clamped);
    centerOn(clamped, zoom);
  }

  function onJumpSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = parseCoord(jumpValue);
    if (!target) {
      setJumpError(`Try something like AF32 (A–${columnLabel(GRID_COLS - 1)}, 1–${GRID_ROWS}).`);
      return;
    }
    setJumpError(null);
    setJumpValue("");
    setSelected(target);
    setCursor(target);
    setJustClaimed(null);
    centerOn(target, Math.max(zoom, 1.4));
  }

  function onClaimed(plot: Plot, claimKey: string) {
    setPlots((current) => [plot, ...current]);
    setJustClaimed({ plot, claimKey });
  }

  const claimedCount = plots.length;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="overflow-hidden rounded-xl border border-line bg-surface card-shadow">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-3 py-2.5">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => zoomFromCentre(0.8)}
              aria-label="Zoom out"
              className="grid size-8 place-items-center rounded-md border border-line text-muted transition hover:text-ink"
            >
              −
            </button>
            <span className="w-14 text-center font-mono text-xs text-muted">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => zoomFromCentre(1.25)}
              aria-label="Zoom in"
              className="grid size-8 place-items-center rounded-md border border-line text-muted transition hover:text-ink"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setZoom(1);
              centerOn({ col: GRID_COLS / 2, row: GRID_ROWS / 2 }, 1);
            }}
            className="rounded-md border border-line px-2.5 py-1.5 text-xs text-muted transition hover:text-ink"
          >
            Fit
          </button>

          <form onSubmit={onJumpSubmit} className="ml-auto flex items-center gap-2">
            <label htmlFor="jump" className="sr-only">
              Go to plot
            </label>
            <input
              id="jump"
              value={jumpValue}
              onChange={(event) => {
                setJumpValue(event.target.value);
                setJumpError(null);
              }}
              placeholder="Go to AF32"
              spellCheck={false}
              autoComplete="off"
              className="w-28 rounded-md border border-line bg-bg px-2.5 py-1.5 font-mono text-xs text-ink placeholder:text-muted/70 focus:border-accent"
            />
            <button
              type="submit"
              className="rounded-md border border-line px-2.5 py-1.5 text-xs text-muted transition hover:text-ink"
            >
              Go
            </button>
          </form>
        </div>

        {jumpError ? (
          <p role="alert" className="border-b border-line bg-raised px-3 py-2 text-xs text-accent">
            {jumpError}
          </p>
        ) : null}

        {/* Viewport */}
        <div
          ref={viewportRef}
          role="application"
          aria-label={`Land map, ${GRID_COLS} by ${GRID_ROWS} plots. Arrow keys to move, Enter to select.`}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={() => setCursor(null)}
          onKeyDown={onKeyDown}
          className="relative h-[420px] touch-none overflow-hidden bg-bg outline-none select-none sm:h-[560px]"
          style={{ cursor: panning ? "grabbing" : "crosshair" }}
        >
          {/* The land itself. Sized in real pixels rather than scaled by a
              transform, so the survey lines stay a crisp 1px at every zoom. */}
          <div
            className="absolute left-0 top-0 origin-top-left survey-paper"
            style={{
              width: surfaceWidth,
              height: surfaceHeight,
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0)`,
              backgroundSize: `${cell}px ${cell}px`,
            }}
          >
            <div
              aria-hidden
              className="absolute inset-0 survey-paper-major"
              style={{ backgroundSize: `${cell * MAJOR_EVERY}px ${cell * MAJOR_EVERY}px` }}
            />

            {plots.map((plot) => {
              const color = getColor(plot.color);
              const isSelected = plot.coord === selectedCoord;
              return (
                <div
                  key={plot.coord}
                  title={`${plot.coord} · ${plot.title} · @${plot.handle}`}
                  className="absolute grid place-items-center overflow-hidden font-mono leading-none"
                  style={{
                    left: plot.col * cell,
                    top: plot.row * cell,
                    width: cell,
                    height: cell,
                    backgroundColor: color.hex,
                    color: color.ink,
                    fontSize: Math.max(7, cell * 0.5),
                    outline: isSelected ? "2px solid var(--ink)" : undefined,
                    outlineOffset: isSelected ? "-2px" : undefined,
                    zIndex: isSelected ? 3 : 1,
                  }}
                >
                  <span aria-hidden>{cell >= 14 ? plot.glyph : null}</span>
                </div>
              );
            })}

            {cursor ? (
              <div
                aria-hidden
                className="pointer-events-none absolute z-[2] border-2 border-accent"
                style={{
                  left: cursor.col * cell,
                  top: cursor.row * cell,
                  width: cell,
                  height: cell,
                }}
              />
            ) : null}

            {selected && !selectedPlot ? (
              <div
                aria-hidden
                className="pointer-events-none absolute z-[2] border-2 border-dashed border-ink"
                style={{
                  left: selected.col * cell,
                  top: selected.row * cell,
                  width: cell,
                  height: cell,
                }}
              />
            ) : null}
          </div>

          {/* Rulers: each tracks one axis of the pan so labels stay aligned. */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-5 overflow-hidden border-b border-line bg-bg/80 backdrop-blur-sm">
            <div
              className="relative h-full"
              style={{ transform: `translate3d(${pan.x}px, 0, 0)`, width: surfaceWidth }}
            >
              {Array.from({ length: Math.ceil(GRID_COLS / MAJOR_EVERY) }, (_, index) => {
                const col = index * MAJOR_EVERY;
                return (
                  <span
                    key={col}
                    className="absolute top-0.5 font-mono text-[10px] text-muted"
                    style={{ left: col * cell + 3 }}
                  >
                    {columnLabel(col)}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="pointer-events-none absolute inset-y-0 left-0 w-6 overflow-hidden border-r border-line bg-bg/80 backdrop-blur-sm">
            <div
              className="relative w-full"
              style={{ transform: `translate3d(0, ${pan.y}px, 0)`, height: surfaceHeight }}
            >
              {Array.from({ length: Math.ceil(GRID_ROWS / MAJOR_EVERY) }, (_, index) => {
                const row = index * MAJOR_EVERY;
                return (
                  <span
                    key={row}
                    className="absolute left-1 font-mono text-[10px] text-muted"
                    style={{ top: row * cell + 2 }}
                  >
                    {row + 1}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line px-3 py-2 text-xs text-muted">
          <span className="font-mono">
            {hoveredCoord ? (
              hoveredPlot ? (
                <>
                  {hoveredCoord} · {hoveredPlot.title} · @{hoveredPlot.handle}
                </>
              ) : (
                <>{hoveredCoord} · unclaimed</>
              )
            ) : (
              "Drag to pan · scroll to zoom · click a plot"
            )}
          </span>
          <span className="ml-auto font-mono">
            {claimedCount} of {GRID_COLS * GRID_ROWS} claimed
          </span>
        </div>
      </section>

      {/* Side panel */}
      <aside className="thin-scroll max-h-none overflow-y-auto rounded-xl border border-line bg-surface p-5 card-shadow lg:max-h-[680px]">
        {justClaimed ? (
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">Recorded</p>
            <h2 className="mt-2 text-xl font-medium text-ink">{justClaimed.plot.title}</h2>
            <p className="mt-1 font-mono text-sm text-muted">
              {justClaimed.plot.coord} · @{justClaimed.plot.handle}
            </p>

            <div className="mt-5 rounded-lg border border-accent/50 bg-raised p-4">
              <h3 className="text-sm font-semibold text-ink">Save your claim key</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">
                This is shown once and cannot be recovered. It is the only way to edit or release{" "}
                {justClaimed.plot.coord}.
              </p>
              <div className="mt-3">
                <CopyField
                  value={justClaimed.claimKey}
                  label={`Claim key for ${justClaimed.plot.coord}`}
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href={`/plot/${justClaimed.plot.coord}`}
                className="rounded-md bg-accent px-3.5 py-2 text-sm font-semibold text-accent-ink"
              >
                Visit your plot
              </Link>
              <button
                type="button"
                onClick={() => {
                  setJustClaimed(null);
                  setSelected(null);
                }}
                className="rounded-md border border-line px-3.5 py-2 text-sm text-muted transition hover:text-ink"
              >
                Keep looking
              </button>
            </div>
          </div>
        ) : selectedPlot ? (
          <PlotPanel plot={selectedPlot} />
        ) : selected && selectedCoord ? (
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
              {regionName(selected.col, selected.row)}
            </p>
            <h2 className="mt-2 font-mono text-2xl text-ink">{selectedCoord}</h2>
            <p className="mt-1 text-sm text-muted">Unclaimed. Put your name on it.</p>
            <div className="mt-5 border-t border-line pt-5">
              <ClaimForm key={selectedCoord} coord={selectedCoord} onClaimed={onClaimed} />
            </div>
          </div>
        ) : (
          <EmptyPanel plots={plots} onPick={(plot) => setSelected({ col: plot.col, row: plot.row })} />
        )}
      </aside>
    </div>
  );
}

function PlotPanel({ plot }: { plot: Plot }) {
  const color = getColor(plot.color);
  return (
    <div>
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="grid size-12 shrink-0 place-items-center rounded-md font-mono text-xl"
          style={{ backgroundColor: color.hex, color: color.ink }}
        >
          {plot.glyph}
        </span>
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
            {regionName(plot.col, plot.row)}
          </p>
          <h2 className="mt-1 text-xl leading-tight font-medium text-ink">{plot.title}</h2>
        </div>
      </div>

      <dl className="mt-5 space-y-2.5 border-t border-line pt-5 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Address</dt>
          <dd className="font-mono text-ink">{plot.coord}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Settler</dt>
          <dd className="font-mono text-ink">@{plot.handle}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Claimed</dt>
          <dd className="text-ink">{formatDate(plot.claimedAt)}</dd>
        </div>
      </dl>

      {plot.bio ? (
        <p className="mt-5 border-t border-line pt-5 text-sm leading-relaxed text-muted">
          {plot.bio}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        {plot.url ? (
          <a
            href={plot.url}
            target="_blank"
            rel="noopener noreferrer nofollow ugc"
            className="rounded-md bg-accent px-3.5 py-2 text-sm font-semibold text-accent-ink"
          >
            {prettyUrl(plot.url)} ↗
          </a>
        ) : null}
        <Link
          href={`/plot/${plot.coord}`}
          className="rounded-md border border-line px-3.5 py-2 text-sm text-muted transition hover:text-ink"
        >
          Plot page
        </Link>
      </div>
    </div>
  );
}

function EmptyPanel({ plots, onPick }: { plots: Plot[]; onPick: (plot: Plot) => void }) {
  const recent = plots.slice(0, 6);

  return (
    <div>
      <h2 className="text-lg font-medium text-ink">Nothing selected</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Click any square to read its deed, or pick an empty one and claim it. Arrow keys work too —
        hold shift to move eight plots at a time.
      </p>

      <h3 className="mt-7 font-mono text-xs uppercase tracking-[0.18em] text-muted">
        Latest claims
      </h3>
      <ul className="mt-3 divide-y divide-line border-t border-line">
        {recent.map((plot) => {
          const color = getColor(plot.color);
          return (
            <li key={plot.coord}>
              <button
                type="button"
                onClick={() => onPick(plot)}
                className="flex w-full items-center gap-3 py-2.5 text-left transition hover:opacity-80"
              >
                <span
                  aria-hidden
                  className="grid size-7 shrink-0 place-items-center rounded font-mono text-xs"
                  style={{ backgroundColor: color.hex, color: color.ink }}
                >
                  {plot.glyph}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-ink">{plot.title}</span>
                  <span className="block font-mono text-[11px] text-muted">
                    {plot.coord} · @{plot.handle}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
