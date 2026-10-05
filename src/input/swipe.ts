import type { Direction } from '@/navigation/model';

import type { Axis } from './intent';

/**
 * Touch interpretation: one swipe → at most one intent, committed on release.
 *
 * The axis locks once movement passes the slop, so diagonal drift cannot change
 * its meaning. A swipe counts if it travels far enough, or if it is a quick flick
 * — short but fast. Swiping up/left moves forward, as content follows the finger.
 */

export interface TouchPoint {
  readonly x: number;
  readonly y: number;
  readonly time: number;
}

/** Movement before the axis locks (px). */
const SLOP_PX = 10;
/** Travel that always counts, as a fraction of the viewport along the axis. */
const DISTANCE_RATIO = 0.08;
const MIN_DISTANCE_PX = 40;
/** A flick: at least this fast (px/ms) over at least this distance. */
const FLICK_VELOCITY = 0.45;
const FLICK_MIN_PX = 24;

export class SwipeGesture {
  private origin: TouchPoint | null = null;
  private axis: Axis | null = null;

  begin(point: TouchPoint): void {
    this.origin = point;
    this.axis = null;
  }

  cancel(): void {
    this.origin = null;
    this.axis = null;
  }

  get tracking(): boolean {
    return this.origin !== null;
  }

  /** Returns the locked axis and current travel once movement passes the slop. */
  move(point: TouchPoint): { axis: Axis; travel: number } | null {
    const origin = this.origin;
    if (!origin) return null;
    const dx = point.x - origin.x;
    const dy = point.y - origin.y;
    if (this.axis === null) {
      if (Math.hypot(dx, dy) < SLOP_PX) return null;
      this.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    return { axis: this.axis, travel: this.axis === 'x' ? dx : dy };
  }

  end(
    point: TouchPoint,
    viewport: { width: number; height: number },
  ): { axis: Axis; direction: Direction } | null {
    const origin = this.origin;
    const axis = this.axis;
    this.cancel();
    if (!origin || !axis) return null;
    const travel = axis === 'x' ? point.x - origin.x : point.y - origin.y;
    const distance = Math.abs(travel);
    const span = axis === 'x' ? viewport.width : viewport.height;
    const velocity = distance / Math.max(point.time - origin.time, 1);
    const far = distance >= Math.max(MIN_DISTANCE_PX, span * DISTANCE_RATIO);
    const flick = distance >= FLICK_MIN_PX && velocity >= FLICK_VELOCITY;
    if (!far && !flick) return null;
    return { axis, direction: travel < 0 ? 1 : -1 };
  }
}
