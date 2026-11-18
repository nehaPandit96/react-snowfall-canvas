import { PRESETS, type SnowIntensity, type SnowPreset } from "./presets";

export interface SnowEngineOptions {
  intensity?: SnowIntensity;
  color?: string;
  /** Flakes per 1,000,000 px² of screen. Overrides the preset's value. */
  density?: number;
  /** Hard cap on flake count. Overrides the preset's value. */
  maxFlakes?: number;
  /** Respect the user's "reduce motion" setting by drawing one still frame. Default true. */
  respectReducedMotion?: boolean;
  /** Start paused (no snow shown). Default false. See `setPaused`. */
  paused?: boolean;
}

interface Flake {
  x: number;
  y: number;
  /** Random 0..1 factors, mapped onto the current preset's ranges every frame. */
  rf: number;
  sf: number;
  of: number;
  /** Sway phase and frequency. */
  phase: number;
  freq: number;
  /** 0..1 visibility, used to fade flakes in and out when the count changes. */
  fade: number;
  dying: boolean;
}

/** Numbers we smoothly blend between when the intensity changes. */
type Params = {
  density: number;
  maxFlakes: number;
  r0: number;
  r1: number;
  s0: number;
  s1: number;
  o0: number;
  o1: number;
  wind: number;
  gust: number;
  sway: number;
};

const toParams = (p: SnowPreset): Params => ({
  density: p.density,
  maxFlakes: p.maxFlakes,
  r0: p.radius[0],
  r1: p.radius[1],
  s0: p.speed[0],
  s1: p.speed[1],
  o0: p.opacity[0],
  o1: p.opacity[1],
  wind: p.wind,
  gust: p.gust,
  sway: p.sway,
});

export interface SnowOverrides {
  density?: number;
  maxFlakes?: number;
}

/** Ignore missing or invalid numbers; clamp negatives to 0. */
const validCount = (n: number | undefined) =>
  typeof n === "number" && Number.isFinite(n) ? Math.max(0, n) : undefined;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Framework-free snowfall renderer. Draws onto the given canvas and sizes
 * itself to the canvas's CSS box.
 */
export class SnowEngine {
  private ctx: CanvasRenderingContext2D;
  private flakes: Flake[] = [];
  private current: Params;
  private target: Params;
  private color: string;
  private intensity: SnowIntensity;
  private overrides: SnowOverrides = {};
  private width = 0;
  private height = 0;
  private time = 0;
  private lastTs = 0;
  private raf = 0;
  private running = false;
  /** Whether a requestAnimationFrame loop is currently scheduled. */
  private looping = false;
  /** 0..1 overall visibility, faded down on pause and back up on play. */
  private master: number;
  private reducedMotion = false;
  private paused: boolean;
  private respectReducedMotion: boolean;
  private resizeObserver?: ResizeObserver;
  private motionQuery?: MediaQueryList;

  constructor(
    private canvas: HTMLCanvasElement,
    options: SnowEngineOptions = {},
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("react-snowfall-canvas: 2D canvas not supported");
    this.ctx = ctx;
    this.color = options.color ?? "#ffffff";
    this.respectReducedMotion = options.respectReducedMotion ?? true;
    this.paused = options.paused ?? false;
    this.master = this.paused ? 0 : 1;
    this.intensity = options.intensity ?? "medium";
    this.overrides = { density: options.density, maxFlakes: options.maxFlakes };
    this.current = this.buildParams();
    this.target = { ...this.current };

    this.resize();
    this.syncFlakeCount(true);

    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(this.resize);
      this.resizeObserver.observe(canvas);
    } else {
      window.addEventListener("resize", this.resize);
    }
    document.addEventListener("visibilitychange", this.onVisibility);

    if (typeof window.matchMedia === "function") {
      this.motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      this.reducedMotion = this.motionQuery.matches;
      this.motionQuery.addEventListener?.("change", this.onMotionChange);
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.refreshLoop();
  }

  stop() {
    this.running = false;
    this.haltLoop();
  }

  destroy() {
    this.stop();
    this.resizeObserver?.disconnect();
    window.removeEventListener("resize", this.resize);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.motionQuery?.removeEventListener?.("change", this.onMotionChange);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /** Change intensity. The switch is blended over about a second. */
  setIntensity(intensity: SnowIntensity) {
    this.intensity = intensity;
    this.retarget();
  }

  /**
   * Override the preset's density and/or flake cap. Pass `undefined` for a
   * field to go back to the preset's value. Changes are blended smoothly.
   */
  setOverrides(overrides: SnowOverrides) {
    this.overrides = { ...overrides };
    this.retarget();
  }

  private buildParams(): Params {
    const params = toParams(PRESETS[this.intensity] ?? PRESETS.medium);
    const density = validCount(this.overrides.density);
    const maxFlakes = validCount(this.overrides.maxFlakes);
    if (density !== undefined) params.density = density;
    if (maxFlakes !== undefined) params.maxFlakes = maxFlakes;
    return params;
  }

  private retarget() {
    this.target = this.buildParams();
    if (this.isIdle()) {
      this.current = { ...this.target };
      this.syncFlakeCount(true);
      this.draw();
    }
  }

  setColor(color: string) {
    this.color = color;
    if (this.isIdle()) this.draw();
  }

  /**
   * Pause: the snow keeps falling while it fades out over about a second,
   * then the animation stops completely. Play: the snow fades back in.
   * Gives users a way to stop the motion (WCAG 2.2.2 Pause, Stop, Hide).
   */
  setPaused(paused: boolean) {
    if (this.paused === paused) return;
    this.paused = paused;
    this.refreshLoop();
  }

  /** Reduced motion: draw single still frames instead of animating. */
  private isStill() {
    return this.respectReducedMotion && this.reducedMotion;
  }

  /** True when nothing needs animating: reduced motion, or fully faded out on pause. */
  private isIdle() {
    return this.isStill() || (this.paused && this.master <= 0);
  }

  private haltLoop() {
    cancelAnimationFrame(this.raf);
    this.looping = false;
  }

  /** Start or stop the animation loop to match the current state. */
  private refreshLoop() {
    if (!this.running) return;
    if (this.isStill()) {
      // No fade under reduced motion: show or hide the still frame at once.
      this.haltLoop();
      this.master = this.paused ? 0 : 1;
      this.draw();
    } else if (this.isIdle()) {
      this.haltLoop();
      this.draw();
    } else if (!this.looping && !document.hidden) {
      this.looping = true;
      this.lastTs = 0;
      this.raf = requestAnimationFrame(this.tick);
    }
  }

  private resize = () => {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.syncFlakeCount(true);
    if (this.running && this.isIdle()) this.draw();
  };

  private onVisibility = () => {
    if (document.hidden) this.haltLoop();
    else this.refreshLoop();
  };

  private onMotionChange = (e: MediaQueryListEvent) => {
    this.reducedMotion = e.matches;
    this.refreshLoop();
  };

  private targetCount() {
    const area = (this.width * this.height) / 1_000_000;
    return Math.min(
      this.current.maxFlakes,
      Math.round(this.current.density * area),
    );
  }

  private makeFlake(instant: boolean): Flake {
    return {
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      rf: Math.random() ** 2, // more small flakes than big ones
      sf: Math.random(),
      of: Math.random(),
      phase: Math.random() * Math.PI * 2,
      freq: 0.5 + Math.random(),
      fade: instant ? 1 : 0,
      dying: false,
    };
  }

  /** Fade in new flakes if we need more; mark extras to fade out. */
  private syncFlakeCount(instant: boolean) {
    const want = this.targetCount();
    let alive = 0;
    for (const f of this.flakes) if (!f.dying) alive++;
    for (const f of this.flakes) {
      if (alive <= want) break;
      if (!f.dying) {
        f.dying = true;
        alive--;
      }
    }
    while (alive < want) {
      this.flakes.push(this.makeFlake(instant));
      alive++;
    }
    if (instant) this.flakes = this.flakes.filter((f) => !f.dying);
  }

  private tick = (ts: number) => {
    if (!this.running) return;
    // Clamp dt so a stalled tab doesn't make flakes jump.
    const dt = this.lastTs ? Math.min((ts - this.lastTs) / 1000, 0.05) : 0.016;
    this.lastTs = ts;

    // Fade the whole snowfall out on pause and back in on play (~1.2 s).
    const step = dt / 1.2;
    this.master = this.paused
      ? Math.max(0, this.master - step)
      : Math.min(1, this.master + step);

    this.update(dt);
    this.draw();
    if (this.isIdle()) {
      this.looping = false; // faded out fully: stop until play
      return;
    }
    this.raf = requestAnimationFrame(this.tick);
  };

  private update(dt: number) {
    this.time += dt;

    // Blend current settings toward the target ones.
    const k = 1 - Math.exp(-dt * 2.5);
    const c = this.current as Record<keyof Params, number>;
    const t = this.target as Record<keyof Params, number>;
    for (const key in c)
      c[key as keyof Params] = lerp(
        c[key as keyof Params],
        t[key as keyof Params],
        k,
      );

    this.syncFlakeCount(false);

    const p = this.current;
    // Gusts: two overlapping slow waves give an uneven, natural-feeling wind.
    const gust =
      p.gust *
      (0.6 * Math.sin(this.time * 0.7) + 0.4 * Math.sin(this.time * 1.9 + 1.3));
    const wind = p.wind + gust;
    const margin = 20;

    for (let i = this.flakes.length - 1; i >= 0; i--) {
      const f = this.flakes[i];
      if (f.dying) {
        f.fade -= dt * 1.5;
        if (f.fade <= 0) {
          this.flakes.splice(i, 1);
          continue;
        }
      } else if (f.fade < 1) {
        f.fade = Math.min(1, f.fade + dt * 1.5);
      }
      const r = lerp(p.r0, p.r1, f.rf);
      // Bigger flakes fall a little faster.
      const speed = lerp(p.s0, p.s1, f.sf) * (0.7 + 0.3 * f.rf);
      f.y += speed * dt;
      f.x += wind * (0.6 + 0.4 * f.rf) * dt;
      f.x += Math.cos(this.time * f.freq + f.phase) * p.sway * dt;

      // Wrap sideways so wind doesn't empty one side of the screen.
      if (f.x > this.width + margin) f.x = -margin;
      else if (f.x < -margin) f.x = this.width + margin;

      if (f.y - r > this.height) {
        f.y = -r - Math.random() * 20;
        f.x = Math.random() * this.width;
      }
    }
  }

  private draw() {
    const { ctx } = this;
    const p = this.current;
    ctx.clearRect(0, 0, this.width, this.height);
    if (this.master <= 0) return;
    ctx.fillStyle = this.color;
    for (const f of this.flakes) {
      const r = lerp(p.r0, p.r1, f.rf);
      ctx.globalAlpha = lerp(p.o0, p.o1, f.of) * f.fade * this.master;
      ctx.beginPath();
      ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
