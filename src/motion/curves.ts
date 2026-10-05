/**
 * Closed-form critically damped spring responses. Shared by the runtime springs
 * and by the build-time generation of matching CSS easing curves.
 *
 * Pure math only: this module is also evaluated by Node during the build.
 */

export type SpringOrder = 1 | 2;

/**
 * ω·t at which a step response settles within 0.1%:
 *   order 1: (1 + x)e^-x = 0.001
 *   order 2: (1 + x + x²/2 + x³/6)e^-x = 0.001
 */
const SETTLE_RATIO: Record<SpringOrder, number> = { 1: 9.2334, 2: 13.0622 };

/** Angular frequency for a spring that settles in `settle` seconds. */
export function omegaFor(settle: number, order: SpringOrder): number {
  return SETTLE_RATIO[order] / Math.max(settle, 1e-3);
}

/** Normalised step response (0 → 1) at `progress` ∈ [0, 1] of the settle time. */
export function stepResponse(progress: number, order: SpringOrder): number {
  const x = SETTLE_RATIO[order] * Math.min(Math.max(progress, 0), 1);
  const e = Math.exp(-x);
  return order === 1 ? 1 - e * (1 + x) : 1 - e * (1 + x + (x * x) / 2 + (x * x * x) / 6);
}

/**
 * CSS `linear()` easing that reproduces a spring's step response, so DOM
 * transitions move with the same character as the 3D stage.
 */
export function cssSpringEasing(order: SpringOrder, mode: 'out' | 'in', samples = 32): string {
  const points: string[] = [];
  for (let i = 0; i <= samples; i++) {
    const p = i / samples;
    const y = mode === 'out' ? stepResponse(p, order) : 1 - stepResponse(1 - p, order);
    points.push(Number(y.toFixed(4)).toString());
  }
  return `linear(${points.join(', ')})`;
}
