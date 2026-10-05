/**
 * Camera flights: one large, continuous movement from wherever the camera is to
 * a destination framing.
 *
 * Each channel (position xyz, target xyz, field of view) follows a quintic Hermite
 * curve in normalised time that starts with the camera's current value, velocity
 * and acceleration and ends at the destination at rest with zero acceleration.
 * That makes every flight C²-continuous: interrupting one mid-air and starting
 * another never jolts — the camera keeps its momentum and simply bends toward the
 * new destination. A smooth bump, 64τ³(1−τ)³, adds the arc (zero value, slope and
 * curvature at both ends, peak 1 at mid-flight), so arcs never disturb continuity.
 *
 * The destination is sampled live, so a destination that moves during the flight
 * (a step change, a resize) is folded in smoothly. Sampling is closed-form in time:
 * the path is identical at 60, 120 or 144 Hz.
 */

/**
 * Time warp w(τ) = τ + k·τ³(1−τ)² applied to the curve parameter: progress runs
 * ahead early and eases late, so a flight builds decisively and settles long and
 * soft. w′(0) = 1 and w″(0) = 0 preserve continuity with the starting velocity and
 * acceleration; k ≤ 7 keeps w monotonic (here w′ stays within 0.67–1.24).
 */
const SETTLE_BIAS = 2.4;

/** Position xyz, target xyz, vertical field of view. */
export const CHANNELS = 7;
export const POSITION = 0;
export const TARGET = 3;
export const FOV = 6;

export type Channels = Float64Array;

export function createChannels(): Channels {
  return new Float64Array(CHANNELS);
}

/** Quintic Hermite basis for (value, velocity, acceleration) at the start and value at the end, plus the arc bump. */
class Basis {
  h0 = 0;
  h1 = 0;
  h2 = 0;
  h5 = 0;
  b = 0;
  d0 = 0;
  d1 = 0;
  d2 = 0;
  d5 = 0;
  db = 0;
  s0 = 0;
  s1 = 0;
  s2 = 0;
  s5 = 0;
  sb = 0;

  at(t: number): void {
    const t2 = t * t;
    const t3 = t2 * t;
    const t4 = t3 * t;
    const t5 = t4 * t;
    this.h0 = 1 - 10 * t3 + 15 * t4 - 6 * t5;
    this.h1 = t - 6 * t3 + 8 * t4 - 3 * t5;
    this.h2 = 0.5 * t2 - 1.5 * t3 + 1.5 * t4 - 0.5 * t5;
    this.h5 = 10 * t3 - 15 * t4 + 6 * t5;
    this.d0 = -30 * t2 + 60 * t3 - 30 * t4;
    this.d1 = 1 - 18 * t2 + 32 * t3 - 15 * t4;
    this.d2 = t - 4.5 * t2 + 6 * t3 - 2.5 * t4;
    this.d5 = -this.d0;
    this.s0 = -60 * t + 180 * t2 - 120 * t3;
    this.s1 = -36 * t + 96 * t2 - 60 * t3;
    this.s2 = 1 - 9 * t + 18 * t2 - 10 * t3;
    this.s5 = -this.s0;
    const u = t * (1 - t);
    const w = 1 - 2 * t;
    this.b = 64 * u * u * u;
    this.db = 192 * u * u * w;
    this.sb = 384 * u * (w * w - u);
  }
}

export class Flight {
  active = false;

  private startTime = 0;
  /** Seconds. */
  private duration = 1;
  private readonly basis = new Basis();
  private readonly p0 = createChannels();
  private readonly v0 = createChannels();
  private readonly a0 = createChannels();
  private readonly arc = createChannels();

  /**
   * Starts a flight at `time` (ms) lasting `duration` seconds, from the camera's
   * current state, with an arc offset per channel at mid-flight.
   */
  begin(
    time: number,
    duration: number,
    value: Channels,
    velocity: Channels,
    acceleration: Channels,
    arc: Channels,
  ): void {
    this.startTime = time;
    this.duration = Math.max(duration, 1e-3);
    this.p0.set(value);
    this.v0.set(velocity);
    this.a0.set(acceleration);
    this.arc.set(arc);
    this.active = true;
  }

  /**
   * Writes the camera state at `time` (ms) toward `destination`: value, velocity
   * (per second) and acceleration (per second²). Returns progress, 0–1; the flight
   * deactivates on arrival.
   */
  sample(
    time: number,
    destination: Channels,
    value: Channels,
    velocity: Channels,
    acceleration: Channels,
  ): number {
    const T = this.duration;
    const progress = Math.min(Math.max((time - this.startTime) / (T * 1000), 0), 1);
    // Curve parameter: front-loaded so the arrival is long and gentle (see SETTLE_BIAS).
    const q = progress * progress;
    const w = progress + SETTLE_BIAS * q * progress * (1 - progress) * (1 - progress);
    const dw = 1 + SETTLE_BIAS * (3 * q - 8 * q * progress + 5 * q * q);
    const ddw = SETTLE_BIAS * (6 * progress - 24 * q + 20 * q * progress);
    const B = this.basis;
    B.at(w);
    for (let i = 0; i < CHANNELS; i++) {
      const p0 = this.p0[i] ?? 0;
      const v = (this.v0[i] ?? 0) * T;
      const a = (this.a0[i] ?? 0) * T * T;
      const p1 = destination[i] ?? 0;
      const lift = this.arc[i] ?? 0;
      const slope = B.d0 * p0 + B.d1 * v + B.d2 * a + B.d5 * p1 + B.db * lift;
      const curvature = B.s0 * p0 + B.s1 * v + B.s2 * a + B.s5 * p1 + B.sb * lift;
      value[i] = B.h0 * p0 + B.h1 * v + B.h2 * a + B.h5 * p1 + B.b * lift;
      velocity[i] = (slope * dw) / T;
      acceleration[i] = (curvature * dw * dw + slope * ddw) / (T * T);
    }
    if (progress >= 1) this.active = false;
    return progress;
  }
}

/** Normalised speed profile of a rest-to-rest flight: 0 at either end, 1 at mid-flight. */
export function flightIntensity(progress: number): number {
  const u = progress * (1 - progress);
  return 16 * u * u;
}
