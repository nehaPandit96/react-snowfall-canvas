export type SnowShape = "circle" | "snowflake" | "mixed";

/**
 * A crystal drawn once onto a small offscreen canvas. Every frame the engine
 * only copies (and rotates/scales) this image, which costs about as much as
 * drawing a circle, instead of re-tracing dozens of line segments per flake.
 */
export interface CrystalSprite {
  canvas: HTMLCanvasElement;
  /** Radius of the crystal's arms inside the sprite, in sprite pixels. */
  radius: number;
  /** Half the sprite's width, i.e. where its center is. */
  half: number;
}

export interface CrystalSprites {
  /** Detailed version, used for flakes that are big on screen. */
  large: CrystalSprite[];
  /** Thicker-lined version, used for small flakes so they don't look faint or aliased. */
  small: CrystalSprite[];
}

/** Number of different crystal designs, so the flakes don't all look the same. */
export const CRYSTAL_VARIANTS = 3;

/** Use the small sprite while a crystal is at most this many device pixels in radius. */
export const SMALL_SPRITE_MAX = 12;

const LARGE = { radius: 32, lineWidth: 2.6 };
const SMALL = { radius: 10, lineWidth: 1.5 };

/** Side branches per design: [position along the arm 0..1, branch length 0..1]. */
const BRANCHES: [number, number][][] = [
  [
    [0.4, 0.32],
    [0.68, 0.22],
  ],
  [[0.55, 0.36]],
  [
    [0.3, 0.2],
    [0.55, 0.28],
    [0.8, 0.16],
  ],
];

const SIN60 = Math.sin(Math.PI / 3);

/** Traces one six-armed crystal of radius `r` centered on the origin. */
function traceCrystal(ctx: CanvasRenderingContext2D, r: number, variant: number) {
  ctx.beginPath();
  for (let arm = 0; arm < 6; arm++) {
    // Path points are transformed as they are added, so rotating between arms
    // lets all six arms share one path and one stroke() call.
    ctx.save();
    ctx.rotate((arm * Math.PI) / 3);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -r);
    for (const [at, len] of BRANCHES[variant]) {
      const y = -r * at;
      const dx = r * len * SIN60;
      const dy = r * len * 0.5;
      ctx.moveTo(0, y);
      ctx.lineTo(dx, y - dy);
      ctx.moveTo(0, y);
      ctx.lineTo(-dx, y - dy);
    }
    ctx.restore();
  }
  if (variant === 1) {
    // A small hexagon around the center.
    const h = r * 0.24;
    for (let k = 0; k <= 6; k++) {
      const a = (k * Math.PI) / 3 - Math.PI / 2;
      if (k === 0) ctx.moveTo(Math.cos(a) * h, Math.sin(a) * h);
      else ctx.lineTo(Math.cos(a) * h, Math.sin(a) * h);
    }
  }
  ctx.stroke();
}

function buildSprite(
  color: string,
  variant: number,
  { radius, lineWidth }: { radius: number; lineWidth: number },
): CrystalSprite {
  const glow = radius * 0.12;
  const half = Math.ceil(radius + lineWidth + glow * 2);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = half * 2;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.translate(half, half);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    // A soft glow. Blur is slow to draw, but it is baked in here only once.
    ctx.shadowColor = color;
    ctx.shadowBlur = glow;
    traceCrystal(ctx, radius, variant);
  }
  return { canvas, radius, half };
}

/** Builds every crystal design at both sizes in the given color. */
export function buildCrystalSprites(color: string): CrystalSprites {
  const large: CrystalSprite[] = [];
  const small: CrystalSprite[] = [];
  for (let v = 0; v < CRYSTAL_VARIANTS; v++) {
    large.push(buildSprite(color, v, LARGE));
    small.push(buildSprite(color, v, SMALL));
  }
  return { large, small };
}
