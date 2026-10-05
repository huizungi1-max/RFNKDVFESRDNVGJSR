/**
 * Pointer position for parallax and spatial effects, normalised to [-1, 1]
 * (x right, y up) with the viewport centre at 0. Written by the input
 * controller from fine pointers only; read by the frame loop. Mutable by design:
 * per-frame data never passes through React.
 */
export const pointer = {
  x: 0,
  y: 0,
  /** False when the pointer has left the window or is not a fine pointer. */
  active: false,
};
