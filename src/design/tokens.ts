/**
 * Design tokens — the single source of truth for the visual system.
 *
 * Consumed twice:
 *  - CSS: serialised to custom properties at build time (`virtual:design-tokens.css`,
 *    see tooling/design-tokens.ts), so the first paint is already on-system.
 *  - WebGL: imported directly, so the 3D stage and the DOM share exact values.
 *
 * Pure data only: this module is also evaluated by Node during the build.
 */

/** Colour roles. Values are sRGB hex; contrast ratios are against `bg`. */
export const color = {
  bg: '#0a0b0d',
  surface: '#111317',
  surfaceRaised: '#171a1f',
  line: '#22262d',
  lineStrong: '#343a43',
  /** Primary text — 15.7:1. */
  fg: '#e4e6e9',
  /** Secondary text — 6.1:1 (AA at any size). */
  fgMuted: '#8b9099',
  /** Tertiary labels — 3.2:1: large text and non-text UI only. */
  fgSubtle: '#5c616b',
  /**
   * Signal — the single accent: copper, the conductor of on-die interconnect.
   * Reserved for state (current, active, focus) and meaningful emission in 3D.
   * 8.5:1.
   */
  signal: '#e39a5b',
  signalMuted: '#8a5f3b',
} as const;

export const font = {
  sans: "'IBM Plex Sans Variable', 'IBM Plex Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  mono: "'IBM Plex Mono', ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace",
} as const;

export const weight = { regular: 400, medium: 500, semibold: 600 } as const;

/**
 * Fluid type scale as [min, max] in rem, interpolated linearly across
 * `fluidRange` viewport widths and clamped outside it.
 */
export const text = {
  /** Technical labels, indices. */
  xs: [0.6875, 0.75],
  sm: [0.8125, 0.875],
  base: [0.9375, 1],
  lg: [1.0625, 1.25],
  xl: [1.375, 1.75],
  display: [2.25, 4],
  hero: [3, 7],
} as const satisfies Record<string, readonly [number, number]>;

/** Viewport widths (px) between which fluid sizes interpolate. */
export const fluidRange = [360, 1440] as const;

export const leading = { tight: 1.05, snug: 1.25, normal: 1.5 } as const;

export const tracking = { tight: '-0.02em', normal: '0em', label: '0.08em' } as const;

/** Spacing scale on a 4px grid. */
export const space = {
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.5rem',
  6: '2rem',
  7: '3rem',
  8: '4rem',
  9: '6rem',
} as const;

export const radius = { none: '0', sm: '2px', md: '4px' } as const;

export const stroke = { hairline: '1px', focus: '2px' } as const;

/** Stacking order of the application layers. */
export const layer = { stage: 0, interface: 10, chrome: 20, overlay: 30, debug: 100 } as const;

/**
 * Layout classes. Viewports whose shortest side is below `compactMaxShortSide`
 * are compact (phones, either orientation); otherwise widths below
 * `wideMinWidth` are medium (tablets, small laptops), the rest wide.
 */
export const layout = {
  compactMaxShortSide: 540,
  wideMinWidth: 1100,
  gutter: { compact: '1.25rem', medium: '2rem', wide: '3rem' },
  /** Minimum interactive target size (WCAG 2.5.5). */
  touchTarget: '2.75rem',
} as const;
