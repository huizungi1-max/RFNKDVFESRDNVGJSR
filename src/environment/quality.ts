import type { RenderTier } from './profile';

/**
 * What each render tier may spend. Later parts read these instead of testing
 * devices themselves, so one table governs complexity across the experience.
 */
export interface QualitySettings {
  /** Device-pixel-ratio bounds for the canvas. */
  readonly dpr: [min: number, max: number];
  /** MSAA on the default framebuffer (fixed when the context is created). */
  readonly antialias: boolean;
  /** Sections either side of the current one kept mounted on the GPU. */
  readonly residency: number;
  /** Detail hint for procedural geometry, 0–1. */
  readonly detail: number;
  /** Whether optional post-processing may run. */
  readonly postprocessing: boolean;
}

export const QUALITY: Readonly<Record<RenderTier, QualitySettings>> = {
  high: { dpr: [1, 2], antialias: true, residency: 2, detail: 1, postprocessing: true },
  balanced: { dpr: [1, 1.75], antialias: true, residency: 1, detail: 0.75, postprocessing: true },
  low: { dpr: [1, 1.25], antialias: false, residency: 1, detail: 0.5, postprocessing: false },
};

const ORDER: readonly RenderTier[] = ['low', 'balanced', 'high'];

/** The lower of two tiers. */
export function minTier(a: RenderTier, b: RenderTier): RenderTier {
  return ORDER.indexOf(a) <= ORDER.indexOf(b) ? a : b;
}
