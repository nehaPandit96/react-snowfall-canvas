export type SnowIntensity = "drizzle" | "medium" | "storm";

export interface SnowPreset {
  /** Flakes per 1,000,000 px² of screen, so density looks the same on any screen size. */
  density: number;
  /** Hard cap on flake count, to protect performance on huge screens. */
  maxFlakes: number;
  /** Flake radius range in CSS px. */
  radius: [number, number];
  /** Fall speed range in px per second. */
  speed: [number, number];
  /** Steady sideways wind in px per second (positive = to the right). */
  wind: number;
  /** How strong wind gusts are, in px per second. 0 = no gusts. */
  gust: number;
  /** Side-to-side sway amplitude in px. */
  sway: number;
  /** Opacity range. */
  opacity: [number, number];
}

export const PRESETS: Record<SnowIntensity, SnowPreset> = {
  drizzle: {
    density: 200,
    maxFlakes: 300,
    radius: [0.8, 2],
    speed: [25, 55],
    wind: 5,
    gust: 0,
    sway: 12,
    opacity: [0.4, 0.8],
  },
  medium: {
    density: 400,
    maxFlakes: 500,
    radius: [1, 3.5],
    speed: [45, 110],
    wind: 15,
    gust: 10,
    sway: 20,
    opacity: [0.5, 0.95],
  },
  storm: {
    density: 260,
    maxFlakes: 550,
    radius: [1, 4.5],
    speed: [160, 360],
    wind: 220,
    gust: 160,
    sway: 8,
    opacity: [0.55, 1],
  },
};
