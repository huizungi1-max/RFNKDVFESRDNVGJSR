/**
 * The application clock. One requestAnimationFrame loop drives every system in a
 * fixed order, then sleeps when nothing is animating — an idle page costs no CPU
 * or GPU time.
 *
 * Phases, in order, every frame:
 *   input  — sample input state
 *   update — simulation: navigation timing, choreography, springs
 *   render — the WebGL stage renders (react-three-fiber is advanced manually)
 *   late   — work that needs this frame's final camera (spatial labels)
 *
 * A handler returns `true` while it needs more frames; anything may call `wake()`
 * to request one. The loop runs at the display's native refresh rate.
 */

export type TickPhase = 'input' | 'update' | 'render' | 'late';

export interface Tick {
  /** requestAnimationFrame timestamp (ms, performance.now() timebase). */
  readonly time: number;
  /** Seconds since the previous frame, clamped for simulation stability. */
  readonly delta: number;
  /** Seconds of ticking so far; pauses while asleep. */
  readonly elapsed: number;
  /** Frames run so far. */
  readonly frame: number;
}

export type TickHandler = (tick: Tick) => boolean | void;

export interface TickerStats {
  /** Smoothed interval between consecutive frames (ms) — the display cadence. */
  intervalMs: number;
  /** Smoothed time spent inside handlers per frame (ms). */
  workMs: number;
  /** Frames run so far. */
  frames: number;
  /** Whether a frame is scheduled. */
  running: boolean;
}

const PHASES: readonly TickPhase[] = ['input', 'update', 'render', 'late'];
const MAX_DELTA = 1 / 20;
/** Intervals above this are pauses (sleep, hidden tab), not frame cadence. */
const MAX_CADENCE_MS = 100;
const SMOOTHING = 0.1;

class Ticker {
  readonly stats: TickerStats = { intervalMs: 1000 / 60, workMs: 0, frames: 0, running: false };

  private readonly handlers: Record<TickPhase, Set<TickHandler>> = {
    input: new Set(),
    update: new Set(),
    render: new Set(),
    late: new Set(),
  };
  private readonly tick = { time: 0, delta: 0, elapsed: 0, frame: 0 };
  private scheduled = false;
  private inFrame = false;
  private wakeRequested = false;
  private holds = 0;
  private lastTime: number | null = null;

  /** Registers a handler for a phase; returns the unsubscribe function. */
  add(phase: TickPhase, handler: TickHandler): () => void {
    this.handlers[phase].add(handler);
    this.wake();
    return () => {
      this.handlers[phase].delete(handler);
    };
  }

  /** Requests at least one more frame. Safe to call at any time, including mid-frame. */
  readonly wake = (): void => {
    if (this.inFrame) {
      this.wakeRequested = true;
      return;
    }
    if (!this.scheduled) {
      this.scheduled = true;
      this.stats.running = true;
      requestAnimationFrame(this.run);
    }
  };

  /** Keeps the loop running until the returned release function is called. */
  hold(): () => void {
    this.holds += 1;
    this.wake();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.holds -= 1;
    };
  }

  /** Resumes cleanly after the page was hidden; returns the cleanup function. */
  attach(): () => void {
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      this.lastTime = null;
      this.wake();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }

  private readonly run = (time: number): void => {
    this.scheduled = false;
    const tick = this.tick;

    // After sleeping there is no previous frame: assume one display interval.
    let seconds = this.stats.intervalMs / 1000;
    if (this.lastTime !== null) {
      const interval = time - this.lastTime;
      if (interval > 0 && interval < MAX_CADENCE_MS) {
        this.stats.intervalMs += (interval - this.stats.intervalMs) * SMOOTHING;
      }
      seconds = interval / 1000;
    }
    this.lastTime = time;
    tick.time = time;
    tick.delta = Math.min(Math.max(seconds, 0), MAX_DELTA);
    tick.elapsed += tick.delta;
    tick.frame += 1;

    this.inFrame = true;
    this.wakeRequested = false;
    let active = this.holds > 0;
    const started = performance.now();
    for (const phase of PHASES) {
      for (const handler of this.handlers[phase]) {
        try {
          if (handler(tick) === true) active = true;
        } catch (error) {
          // Isolate the failure: one broken system must not stop the clock.
          this.handlers[phase].delete(handler);
          console.error(`[ticker] ${phase} handler removed after an error`, error);
        }
      }
    }
    this.inFrame = false;
    this.stats.workMs += (performance.now() - started - this.stats.workMs) * SMOOTHING;
    this.stats.frames = tick.frame;

    if (active || this.wakeRequested) {
      this.scheduled = true;
      requestAnimationFrame(this.run);
    } else {
      this.lastTime = null;
    }
    this.stats.running = this.scheduled;
  };
}

export const ticker = new Ticker();
