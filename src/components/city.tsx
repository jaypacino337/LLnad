"use client";

import { useEffect, useRef } from "react";

import type { CloneView } from "@/lib/clone-api";
import { GRID_H, GRID_W, PLACES, personaFor, poseAt, spriteCells, SPRITE_H, SPRITE_W } from "@/lib/world";

const CELL = 10;
/** Pixels per sprite cell on the map. */
const PX = 2.4;

/**
 * The living map. React renders the static scene once; a requestAnimationFrame
 * loop drives each clone's transform straight on the SVG node, computing poses
 * from the shared deterministic world — no coordinates ever cross the network.
 */
export function City({
  clones,
  selected,
  onSelect,
  bubble,
}: {
  clones: CloneView[];
  selected: string | null;
  onSelect: (mint: string | null) => void;
  /** The most recent speech line, shown over its speaker. */
  bubble: { mint: string; text: string } | null;
}) {
  const nodes = useRef(new Map<string, SVGGElement>());
  const clonesRef = useRef(clones);

  useEffect(() => {
    clonesRef.current = clones;
  }, [clones]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    const tick = () => {
      const now = Date.now();
      for (const clone of clonesRef.current) {
        const node = nodes.current.get(clone.mint);
        if (!node) continue;
        const pose = poseAt(clone.mint, now, clone.awake);
        node.setAttribute(
          "transform",
          `translate(${((pose.x + 0.5) * CELL).toFixed(1)} ${((pose.y + 0.5) * CELL).toFixed(1)})`,
        );
        const body = node.querySelector<SVGGElement>("[data-body]");
        body?.setAttribute("transform", pose.dx < 0 ? "scale(-1 1)" : "scale(1 1)");
        // Keep the speech bubble on the map when its speaker hugs an edge.
        const bubbleNode = node.querySelector<SVGGElement>("[data-bubble]");
        if (bubbleNode) {
          const x = (pose.x + 0.5) * CELL;
          const shift = x < 90 ? 90 - x : x > GRID_W * CELL - 90 ? GRID_W * CELL - 90 - x : 0;
          bubbleNode.setAttribute(
            "transform",
            `translate(${shift.toFixed(1)} ${-SPRITE_H * PX - 10})`,
          );
        }
      }
      if (!reduced) frame = requestAnimationFrame(tick);
    };
    tick();
    // Under reduced motion clones still relocate, just without the stroll.
    const drift = reduced ? setInterval(tick, 5_000) : undefined;
    return () => {
      cancelAnimationFrame(frame);
      if (drift) clearInterval(drift);
    };
  }, []);

  return (
    <svg
      viewBox={`0 0 ${GRID_W * CELL} ${GRID_H * CELL}`}
      className="block w-full"
      role="img"
      aria-label="Map of the city with clones walking between places"
      onClick={() => onSelect(null)}
    >
      {/* streets */}
      <rect width={GRID_W * CELL} height={GRID_H * CELL} fill="var(--bg)" />
      <line
        x1={0}
        y1={12.5 * CELL}
        x2={GRID_W * CELL}
        y2={12.5 * CELL}
        stroke="var(--line)"
        strokeWidth={CELL * 1.6}
      />
      <line
        x1={0}
        y1={24.5 * CELL}
        x2={GRID_W * CELL}
        y2={24.5 * CELL}
        stroke="var(--line)"
        strokeWidth={CELL * 1.2}
        opacity={0.6}
      />

      {/* places */}
      {PLACES.map((place) => {
        const [x1, y1, x2, y2] = place.rect;
        const [dx, dy] = place.door;
        return (
          <g key={place.id}>
            <rect
              x={x1 * CELL}
              y={y1 * CELL}
              width={(x2 - x1 + 1) * CELL}
              height={(y2 - y1 + 1) * CELL}
              fill={place.open ? "var(--raised)" : "var(--surface)"}
              stroke="var(--line-strong)"
              strokeWidth={1.5}
              strokeDasharray={place.open ? "5 4" : undefined}
            />
            <text
              x={(x1 + (x2 - x1 + 1) / 2) * CELL}
              y={(y1 + 1.6) * CELL}
              textAnchor="middle"
              fill="var(--muted)"
              style={{ font: "600 9px var(--font-mono)", letterSpacing: "0.14em" }}
            >
              {place.label}
            </text>
            {/* door */}
            <rect
              x={(dx - 0.5) * CELL}
              y={(dy + (dy < y1 ? 0.5 : -0.5)) * CELL}
              width={CELL}
              height={CELL * 0.5}
              fill="var(--link)"
              opacity={0.5}
            />
          </g>
        );
      })}

      {/* clones */}
      {clones.map((clone) => {
        const cells = spriteCells(clone.mint);
        const { color } = personaFor(clone.mint);
        const isSelected = selected === clone.mint;
        const showBubble = bubble?.mint === clone.mint;
        return (
          <g
            key={clone.mint}
            ref={(node) => {
              if (node) nodes.current.set(clone.mint, node);
              else nodes.current.delete(clone.mint);
            }}
            tabIndex={0}
            role="button"
            aria-label={`${clone.symbol}, ${clone.awake ? "awake" : "asleep"}`}
            style={{ cursor: "pointer" }}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(isSelected ? null : clone.mint);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(isSelected ? null : clone.mint);
              }
            }}
          >
            {isSelected ? (
              <circle r={SPRITE_W * PX * 0.8} cy={-SPRITE_H * PX * 0.4} fill="var(--link)" opacity={0.16} />
            ) : null}
            <g data-body>
              <g
                transform={`translate(${(-SPRITE_W / 2) * PX} ${-SPRITE_H * PX})`}
                opacity={clone.awake ? 1 : 0.45}
              >
                {cells.flatMap((row, y) =>
                  row.map((on, x) =>
                    on ? (
                      <rect key={`${x}-${y}`} x={x * PX} y={y * PX} width={PX} height={PX} fill={color} />
                    ) : null,
                  ),
                )}
              </g>
            </g>
            <text
              y={10}
              textAnchor="middle"
              fill={clone.awake ? "var(--ink-soft)" : "var(--muted)"}
              style={{ font: "600 8px var(--font-mono)" }}
            >
              {clone.symbol.slice(0, 10)}
            </text>
            {!clone.awake ? (
              <text
                x={SPRITE_W * PX * 0.6}
                y={-SPRITE_H * PX - 4}
                fill="var(--muted)"
                style={{ font: "italic 600 9px var(--font-mono)" }}
              >
                z z
              </text>
            ) : null}
            {showBubble && bubble ? (
              <g data-bubble transform={`translate(0 ${-SPRITE_H * PX - 10})`} pointerEvents="none">
                <rect
                  x={-86}
                  y={-24}
                  width={172}
                  height={22}
                  rx={3}
                  fill="var(--surface)"
                  stroke="var(--line-strong)"
                />
                <text
                  y={-10}
                  textAnchor="middle"
                  fill="var(--ink)"
                  style={{ font: "9px var(--font-mono)" }}
                >
                  {bubble.text.length > 38 ? `${bubble.text.slice(0, 37)}…` : bubble.text}
                </text>
              </g>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
