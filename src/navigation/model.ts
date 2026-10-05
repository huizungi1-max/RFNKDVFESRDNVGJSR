import type { SectionId } from '@/content/schema';
import {
  reducedTransitions,
  transitions,
  type Choreography,
  type TransitionTiming,
} from '@/design/motion';

import { section, sectionAt } from './structure';

/**
 * Pure navigation rules. No state, no side effects: given where the visitor is,
 * these decide where an intent leads and how the transition is choreographed.
 */

export interface Stop {
  readonly section: SectionId;
  readonly step: number;
}

export type Direction = 1 | -1;

export type NavigationCause =
  /** Placement at boot or from a deep link. */
  | 'initial'
  /** Wheel, trackpad, or touch swipe. */
  | 'gesture'
  | 'keyboard'
  /** On-screen controls (next, step buttons). */
  | 'control'
  /** Direct selection from the section navigation — recorded in history. */
  | 'select'
  /** Browser history or a hand-edited URL. */
  | 'url';

export interface Transition {
  readonly id: number;
  /** Between sections, or between steps of one section. */
  readonly kind: 'section' | 'step';
  readonly from: Stop;
  readonly to: Stop;
  readonly direction: Direction;
  readonly choreography: Choreography;
  readonly cause: NavigationCause;
  /** performance.now() timebase (ms). */
  readonly startedAt: number;
  readonly duration: number;
}

export function sameStop(a: Stop, b: Stop): boolean {
  return a.section === b.section && a.step === b.step;
}

export function clampStep(id: SectionId, step: number): number {
  const { steps } = section(id);
  return Math.min(Math.max(Math.round(step), 0), steps - 1);
}

/**
 * Next stop along the linear journey, or null at either end. Stepped sections
 * that walk linearly are entered at their first step going forward and their
 * last going back, so reversing retraces the same path.
 */
export function linearTarget(
  current: Stop,
  remembered: readonly number[],
  direction: Direction,
): Stop | null {
  const here = section(current.section);
  if (here.linearSteps) {
    const step = current.step + direction;
    if (step >= 0 && step < here.steps) return { section: here.id, step };
  }
  const next = sectionAt(here.index + direction);
  if (!next) return null;
  const step = next.linearSteps
    ? direction > 0
      ? 0
      : next.steps - 1
    : (remembered[next.index] ?? 0);
  return { section: next.id, step };
}

/** Adjacent step inside the current section, or null at its ends and in single-view sections. */
export function withinTarget(current: Stop, direction: Direction): Stop | null {
  const here = section(current.section);
  const step = current.step + direction;
  return here.steps > 1 && step >= 0 && step < here.steps ? { section: here.id, step } : null;
}

export function directionBetween(from: Stop, to: Stop): Direction {
  const delta =
    from.section === to.section
      ? to.step - from.step
      : section(to.section).index - section(from.section).index;
  return delta < 0 ? -1 : 1;
}

/**
 * Adjacent sections travel; distant ones cut (fade through) rather than fly past
 * everything in between. Reduced motion always cuts.
 */
export function resolveChoreography(from: Stop, to: Stop, reduced: boolean): Choreography {
  if (from.section === to.section) return 'step';
  if (reduced) return 'cut';
  const distance = Math.abs(section(to.section).index - section(from.section).index);
  return distance === 1 ? 'travel' : 'cut';
}

export function timingFor(choreography: Choreography, reduced: boolean): TransitionTiming {
  return (reduced ? reducedTransitions : transitions)[choreography];
}
