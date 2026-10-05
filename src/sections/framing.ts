/** Field-of-view geometry shared by section framing and the camera rig. */

const DEG = Math.PI / 180;

/** Widest vertical field of view the rig will use on tall viewports (degrees). */
export const MAX_VERTICAL_FOV = 72;

/** Horizontal field of view (degrees) of a vertical one at an aspect ratio. */
export function horizontalFov(verticalFov: number, aspect: number): number {
  return (2 * Math.atan(Math.tan((verticalFov * DEG) / 2) * aspect)) / DEG;
}

/**
 * Vertical field of view that keeps at least `minHorizontal` across the
 * viewport, so subjects framed for landscape stay in frame on portrait screens.
 */
export function fitVerticalFov(vertical: number, minHorizontal: number, aspect: number): number {
  const needed = (2 * Math.atan(Math.tan((minHorizontal * DEG) / 2) / aspect)) / DEG;
  return Math.min(Math.max(vertical, needed), MAX_VERTICAL_FOV);
}
