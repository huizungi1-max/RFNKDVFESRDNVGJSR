/**
 * Motion language: calm → build → accelerate → transform → settle.
 *
 * 3D motion runs on critically damped springs: interruptible, velocity-continuous
 * and frame-rate independent. A spring's `settle` is the time a step change takes
 * to come within 0.1% of its target; most of the travel happens in the first half,
 * the rest is the settle. Order-2 springs cascade two stages, so motion also starts
 * with zero acceleration (a jerk-free build) — used for the camera and stage travel.
 *
 * DOM motion uses CSS transitions on transform/opacity (compositor-driven) with
 * curves derived from the same spring response, and the durations below.
 *
 * Pure data only: this module is also evaluated by Node during the build.
 */

export interface SpringToken {
  /** Seconds to settle within 0.1% of a step change. */
  readonly settle: number;
  /** 1 = critically damped spring, 2 = two cascaded stages (smooth start). */
  readonly order: 1 | 2;
}

export type SpringName =
  'travel' | 'follow' | 'presence' | 'cutOut' | 'cutIn' | 'step' | 'reveal' | 'parallax';

type SpringSet = Readonly<Record<SpringName, SpringToken>>;

export const springs: SpringSet = {
  /** Camera travel between adjacent sections. */
  travel: { settle: 1.5, order: 2 },
  /** Camera following shot changes within a section. */
  follow: { settle: 0.7, order: 2 },
  /** Section scenes entering and leaving during travel. */
  presence: { settle: 1.1, order: 1 },
  /** Fade-through: outgoing scene. */
  cutOut: { settle: 0.45, order: 1 },
  /** Fade-through: incoming scene. */
  cutIn: { settle: 0.9, order: 1 },
  /** Continuous step position (project stages). */
  step: { settle: 1, order: 2 },
  /** A late-loading scene fading in once ready. */
  reveal: { settle: 0.8, order: 1 },
  /** Pointer parallax. */
  parallax: { settle: 0.9, order: 1 },
};

/** Reduced motion: no travel, short fades, no parallax. */
export const reducedSprings: SpringSet = {
  travel: { settle: 0.3, order: 1 },
  follow: { settle: 0.3, order: 1 },
  presence: { settle: 0.3, order: 1 },
  cutOut: { settle: 0.2, order: 1 },
  cutIn: { settle: 0.3, order: 1 },
  step: { settle: 0.12, order: 1 },
  reveal: { settle: 0.3, order: 1 },
  parallax: { settle: 0.3, order: 1 },
};

/**
 * Transition choreographies:
 *  - travel: adjacent sections — the camera travels; scenes crossfade.
 *  - cut:    distant sections — fade out, cut the camera, fade in (no fly-through).
 *  - step:   within a section — the environment transforms between steps.
 */
export type Choreography = 'travel' | 'cut' | 'step';

export interface TransitionTiming {
  /** Total length (ms): when navigation reports the transition settled. */
  readonly duration: number;
  /** Outgoing DOM content (ms). */
  readonly exit: number;
  /** Delay before incoming DOM content begins (ms). */
  readonly enterDelay: number;
  /** Incoming DOM content (ms). */
  readonly enter: number;
  /** Incoming scene presence begins after this fraction of `duration` (travel only). */
  readonly incomingAt: number;
}

type TimingSet = Readonly<Record<Choreography, TransitionTiming>>;

export const transitions: TimingSet = {
  travel: { duration: 1500, exit: 320, enterDelay: 420, enter: 900, incomingAt: 0.18 },
  cut: { duration: 1350, exit: 280, enterDelay: 450, enter: 900, incomingAt: 0 },
  step: { duration: 1000, exit: 240, enterDelay: 300, enter: 650, incomingAt: 0 },
};

export const reducedTransitions: TimingSet = {
  travel: { duration: 450, exit: 150, enterDelay: 150, enter: 300, incomingAt: 0 },
  cut: { duration: 450, exit: 150, enterDelay: 150, enter: 300, incomingAt: 0 },
  step: { duration: 350, exit: 120, enterDelay: 120, enter: 230, incomingAt: 0 },
};

/** Spatial amplitudes. */
export const amplitude = {
  /** DOM content travel on enter/exit (CSS length). */
  contentShift: '1.25rem',
  /** Camera parallax offset as a fraction of the shot distance. */
  parallax: 0.035,
  /** Camera arrival dolly after a cut, as a fraction of the shot distance. */
  arrival: 0.08,
} as const;

/** Micro-interactions (ms): short, restrained, informative. */
export const micro = { hover: 160, press: 90, reveal: 600 } as const;
