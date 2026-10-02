import { personaFor, spriteCells, SPRITE_H, SPRITE_W } from "@/lib/world";

/**
 * A clone's pixel body. Pure render of the deterministic sprite grid, so the
 * same mint looks identical in the city, the gallery and on share surfaces.
 */
export function CloneSprite({
  mint,
  size = 40,
  className = "",
  asleep = false,
}: {
  mint: string;
  size?: number;
  className?: string;
  asleep?: boolean;
}) {
  const cells = spriteCells(mint);
  const { color } = personaFor(mint);
  return (
    <svg
      viewBox={`0 0 ${SPRITE_W} ${SPRITE_H}`}
      width={size}
      height={(size * SPRITE_H) / SPRITE_W}
      className={`pixelated ${className}`}
      aria-hidden
      opacity={asleep ? 0.45 : 1}
    >
      {cells.flatMap((row, y) =>
        row.map((on, x) =>
          on ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={color} /> : null,
        ),
      )}
    </svg>
  );
}
