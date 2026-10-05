import type { SpringToken } from '@/design/motion';

import { omegaFor, type SpringOrder } from './curves';

/** Largest integration step for cascaded springs (s); keeps them rate-independent. */
const MAX_SUBSTEP = 1 / 240;

/**
 * Critically damped spring — the motion primitive for the 3D stage.
 *
 * Integration is closed-form, so it is stable and frame-rate independent at any
 * refresh rate. Changing `target` mid-flight preserves position and velocity:
 * interrupted motion stays continuous instead of restarting.
 *
 * Order 2 cascades two stages (target → inner → value), so motion also begins
 * with zero acceleration — the "build" of the motion language.
 *
 * Allocation-free after construction; safe to step every frame.
 */
export class Spring {
  value: number;
  velocity = 0;
  target: number;

  private order: SpringOrder = 1;
  private omega = 1;
  private innerValue: number;
  private innerVelocity = 0;
  private readonly precision: number;

  constructor(value: number, token: SpringToken, precision = 1e-4) {
    this.value = value;
    this.target = value;
    this.innerValue = value;
    this.precision = precision;
    this.configure(token);
  }

  /** Changes the spring's character without disturbing its current motion. */
  configure(token: SpringToken): void {
    if (token.order === 2 && this.order === 1) {
      this.innerValue = this.value;
      this.innerVelocity = this.velocity;
    }
    this.order = token.order;
    this.omega = omegaFor(token.settle, token.order);
  }

  /** Moves to `value` instantly, with no residual motion. */
  snap(value: number = this.target): void {
    this.value = value;
    this.target = value;
    this.innerValue = value;
    this.velocity = 0;
    this.innerVelocity = 0;
  }

  get resting(): boolean {
    const p = this.precision;
    const outer = Math.abs(this.value - this.target) < p && Math.abs(this.velocity) < p;
    if (this.order === 1) return outer;
    return outer && Math.abs(this.innerValue - this.target) < p && Math.abs(this.innerVelocity) < p;
  }

  /** Advances by `dt` seconds. Returns whether the spring is still moving. */
  step(dt: number): boolean {
    if (this.resting) {
      this.snap();
      return false;
    }
    const w = this.omega;
    if (this.order === 1) {
      this.integrateOuter(this.target, w, dt);
      return true;
    }
    const steps = Math.max(1, Math.ceil(dt / MAX_SUBSTEP));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      // Inner stage chases the target; the visible value chases the inner stage.
      const y = this.innerValue - this.target;
      const c = this.innerVelocity + w * y;
      const e = Math.exp(-w * h);
      this.innerValue = this.target + (y + c * h) * e;
      this.innerVelocity = (this.innerVelocity - w * c * h) * e;
      this.integrateOuter(this.innerValue, w, h);
    }
    return true;
  }

  private integrateOuter(goal: number, w: number, dt: number): void {
    const y = this.value - goal;
    const c = this.velocity + w * y;
    const e = Math.exp(-w * dt);
    this.value = goal + (y + c * dt) * e;
    this.velocity = (this.velocity - w * c * dt) * e;
  }
}
