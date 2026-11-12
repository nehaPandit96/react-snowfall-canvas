import { useEffect, useRef, type CSSProperties } from 'react';
import { SnowEngine } from './engine';
import type { SnowIntensity } from './presets';

export interface SnowfallProps {
  /** How heavy the snow is. Default: "medium". */
  intensity?: SnowIntensity;
  /** Flake color (any CSS color). Default: "#ffffff". */
  color?: string;
  /**
   * Flakes per 1,000,000 px² of screen. Overrides the intensity preset's value.
   * Leave unset to use the preset.
   */
  density?: number;
  /**
   * Hard cap on the number of flakes. Overrides the intensity preset's value.
   * Leave unset to use the preset.
   */
  maxFlakes?: number;
  /** Stacking order of the overlay. Default: 9999. */
  zIndex?: number;
  /**
   * "fixed" (default) covers the whole viewport.
   * "absolute" fills the nearest positioned parent instead.
   */
  position?: 'fixed' | 'absolute';
  /** Draw a still frame when the user prefers reduced motion. Default: true. */
  respectReducedMotion?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function Snowfall({
  intensity = 'medium',
  color = '#ffffff',
  density,
  maxFlakes,
  zIndex = 9999,
  position = 'fixed',
  respectReducedMotion = true,
  className,
  style,
}: SnowfallProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SnowEngine | null>(null);

  // Create the engine once per mount (and if reduced-motion handling changes).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new SnowEngine(canvas, {
      intensity,
      color,
      density,
      maxFlakes,
      respectReducedMotion,
    });
    engineRef.current = engine;
    engine.start();
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
    // intensity/color/density/maxFlakes are applied by the effects below without restarting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [respectReducedMotion]);

  useEffect(() => {
    engineRef.current?.setIntensity(intensity);
  }, [intensity]);

  useEffect(() => {
    engineRef.current?.setOverrides({ density, maxFlakes });
  }, [density, maxFlakes]);

  useEffect(() => {
    engineRef.current?.setColor(color);
  }, [color]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{
        position,
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex,
        display: 'block',
        ...style,
      }}
    />
  );
}
