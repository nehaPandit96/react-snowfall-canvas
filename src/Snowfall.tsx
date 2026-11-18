import { useEffect, useRef, useState, type CSSProperties } from 'react';
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
  /**
   * Pause the snow: it fades out and the animation stops; setting it back to
   * false fades the snow in again. Pass this to control pausing from your own UI. Leave unset to let the built-in button manage it.
   */
  paused?: boolean;
  /** Called when the built-in button asks to pause (`true`) or play (`false`). */
  onPausedChange?: (paused: boolean) => void;
  /**
   * Show a keyboard-accessible pause/play button in the bottom-right corner,
   * so users can stop the motion (WCAG 2.2.2). Default: false.
   * Hidden while the snow is already still because of reduced motion.
   */
  showPauseButton?: boolean;
  /** Extra inline styles for the pause/play button. */
  pauseButtonStyle?: CSSProperties;
  className?: string;
  style?: CSSProperties;
}

/** Tracks the user's "reduce motion" setting. */
function usePrefersReducedMotion() {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.(query).matches === true,
  );
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    setReduced(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
}

export function Snowfall({
  intensity = 'medium',
  color = '#ffffff',
  density,
  maxFlakes,
  zIndex = 9999,
  position = 'fixed',
  respectReducedMotion = true,
  paused: pausedProp,
  onPausedChange,
  showPauseButton = false,
  pauseButtonStyle,
  className,
  style,
}: SnowfallProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SnowEngine | null>(null);
  const [pausedState, setPausedState] = useState(false);
  const paused = pausedProp ?? pausedState;
  const reducedMotion = usePrefersReducedMotion();
  const stillFromMotion = respectReducedMotion && reducedMotion;

  const togglePaused = () => {
    const next = !paused;
    if (pausedProp === undefined) setPausedState(next);
    onPausedChange?.(next);
  };

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
      paused,
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

  useEffect(() => {
    engineRef.current?.setPaused(paused);
  }, [paused]);

  return (
    <>
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
      {showPauseButton && !stillFromMotion && (
        <button
          type="button"
          onClick={togglePaused}
          style={{
            position,
            right: 16,
            bottom: 16,
            zIndex: zIndex + 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            border: '1px solid rgba(255,255,255,0.7)',
            borderRadius: 999,
            background: 'rgba(15,23,42,0.85)',
            color: '#ffffff',
            font: '600 14px/1.2 system-ui, sans-serif',
            cursor: 'pointer',
            ...pauseButtonStyle,
          }}
        >
          <span aria-hidden="true">{paused ? '\u25B6' : '\u275A\u275A'}</span>
          {paused ? 'Play snow' : 'Pause snow'}
        </button>
      )}
    </>
  );
}
