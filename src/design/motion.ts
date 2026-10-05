/**
 * Motion language: LARGE · DRAMATIC · SMOOTH · SPACIOUS · CONTROLLED.
 *
 * Hierarchy — a lower level never competes with a higher one:
 *   1. Camera — the primary instrument: one large, continuous movement per transition.
 *   2. Major 3D objects — one significant transformation at a time.
 *   3. Lighting and environment — subtle support.
 *   4. Micro detail — rare, and never while the camera is moving.
 *
 * Rhythm: still → one big movement → smooth settle → still. Nothing idles in motion;
 * once a transition settles, the frame loop stops.
 *
 * Camera flights are C²-continuous: they start from the camera's current position,
 * velocity and acceleration (so interrupting one never jolts), accelerate and
 * decelerate with zero jerk at both ends, and arrive at rest. Springs carry the
 * remaining continuous values; `settle` is the time a step change takes to come
 * within 0.1% of its target, and order-2 springs also start with zero acceleration.
 *
 * Interface text never travels: it fades out as the camera departs and fades in
 * as the camera settles.
 *
 * Pure data only: this module is also evaluated by Node during the build.
 */

export interface SpringToken {
  /** Seconds to settle within 0.1% of a step change. */
  readonly settle: number;
  /** 1 = critically damped spring, 2 = two cascaded stages (smooth start). */
  readonly order: 1 | 2;
}

/** Camera flights between sections. */
export const flight = {
  /** Duration (ms) = base + perUnit · √distance, within [min, max]: fast, never trapping. */
  duration: { base: 850, perUnit: 110, min: 1250, max: 2400 },
  /**
   * Arc lift as a fraction of the flight distance. Neighbours curve through space;
   * distant jumps pull far back, revealing the environment, before approaching.
   */
  arc: { adjacent: 0.16, distant: 0.42, max: 72 },
  /** Field-of-view widening at the apex of a distant flight (degrees). */
  revealFov: 6,
  /** Re-framing after a layout change (ms). */
  reframe: 900,
  /** Fraction of a flight after which the arriving section activates. */
  arrivalAt: 0.45,
} as const;

export type SpringName = 'activation' | 'reveal' | 'step' | 'parallax' | 'veil';

type SpringSet = Readonly<Record<SpringName, SpringToken>>;

export const springs: SpringSet = {
  /** A section's own transformation as the camera leaves or arrives (level 2). */
  activation: { settle: 0.9, order: 2 },
  /** A scene emerging once loaded — never a pop. */
  reveal: { settle: 0.9, order: 1 },
  /** Continuous step position: the camera's rail and the environment move together. */
  step: { settle: 1.2, order: 2 },
  /** Pointer parallax, for framings that opt in: slow and weighty. */
  parallax: { settle: 1.4, order: 2 },
  /** Reduced-motion veil (unused with full motion). */
  veil: { settle: 0.2, order: 1 },
};

/** Reduced motion: the camera never travels — it cuts behind a brief veil. */
export const reducedSprings: SpringSet = {
  activation: { settle: 0.25, order: 1 },
  reveal: { settle: 0.3, order: 1 },
  step: { settle: 0.12, order: 1 },
  parallax: { settle: 0.3, order: 1 },
  veil: { settle: 0.2, order: 1 },
};

/**
 * Transition choreographies:
 *  - travel: between sections — a camera flight through the world.
 *  - step:   within a section — the camera glides along the section's rail while
 *            its environment transforms.
 *  - cut:    reduced motion only — veil, relocate, unveil.
 */
export type Choreography = 'travel' | 'step' | 'cut';

/** Fixed durations (ms); travel durations come from flight distance. */
export const durations = { step: 1200, cut: 520 } as const;
export const reducedDurations = { step: 520, cut: 520 } as const;

/** Interface timing per choreography: fade out (ms), fade in (ms), fade-in start (fraction of the transition). */
export interface DomTiming {
  readonly exit: number;
  readonly enter: number;
  readonly enterAt: number;
}

type DomSet = Readonly<Record<Choreography, DomTiming>>;

export const dom: DomSet = {
  travel: { exit: 280, enter: 700, enterAt: 0.62 },
  step: { exit: 220, enter: 520, enterAt: 0.45 },
  cut: { exit: 150, enter: 260, enterAt: 0.5 },
};

export const reducedDom: DomSet = {
  travel: { exit: 120, enter: 220, enterAt: 0.5 },
  step: { exit: 120, enter: 220, enterAt: 0.5 },
  cut: { exit: 120, enter: 220, enterAt: 0.5 },
};

/** Micro-interactions (ms): short, restrained, informative — level 4. */
export const micro = { hover: 160, reveal: 600 } as const;
