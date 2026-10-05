/**
 * Read-only camera state for everything that should defer to the camera — the
 * motion hierarchy's level 1. Written once per frame by the camera rig.
 * (Plain data, no three.js: diagnostics may import it.)
 */
export const cameraState = {
  /** `flight`: travelling between sections; `rail`: framing the focused section. */
  mode: 'rail' as 'rail' | 'flight',
  /** Progress of the current flight, 0–1 (1 on the rail). */
  progress: 1,
  /**
   * How hard the camera is moving, 0–1 (peak of a flight = 1). Secondary motion
   * should yield to it: hold detail animation while this is high.
   */
  intensity: 0,
  position: { x: 0, y: 0, z: 0 },
  fov: 0,
};
