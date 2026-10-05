import type { Direction } from '@/navigation/model';

import type { Axis } from './intent';

/**
 * Wheel and trackpad interpretation: one deliberate gesture → at most one intent,
 * however many events it produces.
 *
 * - A gesture ends after a short silence; a gesture after silence is always
 *   deliberate and is honoured immediately.
 * - Trackpads keep emitting momentum for a second or more after the fingers lift.
 *   Momentum only decays, so once a gesture is past its peak, a sustained rise
 *   well above the decaying level — or a reversal — is a new swipe, honoured
 *   without waiting for the tail to die out.
 * - Notched wheels have no momentum: a continuous roll is one gesture, however long.
 * - Smooth deltas must travel a minimum distance, so resting fingers and small
 *   accidental movement never navigate.
 */

export interface WheelSample {
  /** Pixel-normalised deltas. */
  readonly dx: number;
  readonly dy: number;
  /** Event timestamp (ms). */
  readonly time: number;
  /** A discrete mouse-wheel notch rather than smooth (trackpad) scrolling. */
  readonly notched: boolean;
}

export interface WheelResult {
  /** This sample began a new gesture. */
  readonly gestureStart: boolean;
  readonly intent: { readonly axis: Axis; readonly direction: Direction } | null;
}

/** Silence that ends a gesture (ms). */
const GAP_MS = 200;
/** Smooth-scroll distance that commits a gesture (px). */
const COMMIT_PX = 30;
/** Momentum is "decaying" once below this fraction of the gesture's peak. */
const ARM_RATIO = 0.7;
/** A new swipe inside momentum rises to this multiple of the momentum trough… */
const RISE_RATIO = 2;
/** …over at least this many consecutive increasing samples. */
const RISE_SAMPLES = 2;
/** Rises and reversals smaller than this are sensor noise (px). */
const MIN_SIGNIFICANT_PX = 6;
/** Minimum spacing after a swipe detected inside momentum (ms). */
const MOMENTUM_REPEAT_MS = 350;
/** Minimum spacing for a reversal (ms): undoing should feel immediate. */
const REVERSE_MS = 150;

type StartCause = 'gap' | 'rise' | 'reversal';

export class WheelGesture {
  private lastTime = Number.NEGATIVE_INFINITY;
  private lastMagnitude = 0;
  private sumX = 0;
  private sumY = 0;
  private notchedGesture = false;
  private startCause: StartCause = 'gap';

  private committed = false;
  private committedAxis: Axis = 'y';
  private committedSign = 0;
  private peak = 0;
  private armed = false;
  private trough = Number.POSITIVE_INFINITY;
  private rising = 0;

  private lastIntentTime = Number.NEGATIVE_INFINITY;

  push(sample: WheelSample): WheelResult {
    const { dx, dy, time } = sample;
    const axis: Axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    const value = axis === 'x' ? dx : dy;
    const magnitude = Math.abs(value);

    let start: StartCause | null = time - this.lastTime > GAP_MS ? 'gap' : null;
    if (!start && this.committed) start = this.detectWithinStream(axis, value);
    this.lastTime = time;
    this.lastMagnitude = magnitude;

    if (start) {
      this.committed = false;
      this.sumX = 0;
      this.sumY = 0;
      this.notchedGesture = sample.notched;
      this.startCause = start;
    }
    const gestureStart = start !== null;
    if (this.committed) return { gestureStart, intent: null };

    this.sumX += dx;
    this.sumY += dy;
    const commitAxis: Axis = Math.abs(this.sumX) > Math.abs(this.sumY) ? 'x' : 'y';
    const total = commitAxis === 'x' ? this.sumX : this.sumY;
    if (total === 0 || (!this.notchedGesture && Math.abs(total) < COMMIT_PX)) {
      return { gestureStart, intent: null };
    }

    // Gestures detected inside a stream wait out a short spacing (hardware bounce,
    // momentum artefacts); a gesture that keeps going commits once it has passed.
    const spacing =
      this.startCause === 'gap'
        ? 0
        : this.startCause === 'reversal'
          ? REVERSE_MS
          : MOMENTUM_REPEAT_MS;
    if (time - this.lastIntentTime < spacing) return { gestureStart, intent: null };

    const direction: Direction = total > 0 ? 1 : -1;
    this.committed = true;
    this.committedAxis = commitAxis;
    this.committedSign = direction;
    this.peak = magnitude;
    this.armed = false;
    this.trough = Number.POSITIVE_INFINITY;
    this.rising = 0;
    this.lastIntentTime = time;
    return { gestureStart, intent: { axis: commitAxis, direction } };
  }

  /** Inside a committed gesture's stream: does this sample start a new gesture? */
  private detectWithinStream(axis: Axis, value: number): StartCause | null {
    const magnitude = Math.abs(value);
    const significant = magnitude >= MIN_SIGNIFICANT_PX;
    if (significant && axis === this.committedAxis && Math.sign(value) === -this.committedSign) {
      return 'reversal';
    }
    // Notched wheels have no momentum to look inside: a continuous roll is one gesture.
    if (this.notchedGesture) return null;
    if (!this.armed) {
      this.peak = Math.max(this.peak, magnitude);
      if (magnitude <= this.peak * ARM_RATIO) {
        this.armed = true;
        this.trough = magnitude;
      }
      return null;
    }
    this.rising = magnitude > this.lastMagnitude ? this.rising + 1 : 0;
    this.trough = Math.min(this.trough, magnitude);
    const rise = significant && magnitude > this.trough * RISE_RATIO && this.rising >= RISE_SAMPLES;
    return rise ? 'rise' : null;
  }
}

const LINE_PX = 16;

/** Pixel-normalised deltas for any `deltaMode`. */
export function wheelDeltas(event: WheelEvent): { dx: number; dy: number } {
  const scale =
    event.deltaMode === WheelEvent.DOM_DELTA_LINE
      ? LINE_PX
      : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
        ? window.innerHeight
        : 1;
  return { dx: event.deltaX * scale, dy: event.deltaY * scale };
}

/**
 * Heuristic for a notched mouse wheel: line/page deltas, or the legacy
 * `wheelDelta` reporting whole notches (multiples of 120).
 */
export function isNotched(event: WheelEvent): boolean {
  if (event.deltaMode !== WheelEvent.DOM_DELTA_PIXEL) return true;
  const legacy = (event as WheelEvent & { wheelDeltaY?: number }).wheelDeltaY;
  return legacy !== undefined && legacy !== 0 && legacy % 120 === 0;
}
