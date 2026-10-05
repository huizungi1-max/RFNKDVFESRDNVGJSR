import type { SectionId } from '@/content/schema';
import { durations, flight, reducedDurations, type Choreography } from '@/design/motion';
import type { Stop } from '@/navigation/model';
import { section } from '@/navigation/structure';
import type { PointLike } from '@/stage/spatial';

import { SECTION_DEFINITIONS, createShotFrame } from './registry';

/**
 * How the visitor passes from one stop to another — the choreography contract
 * shared by navigation (timing), the interface (when text fades) and the stage
 * (the camera's flight). One place decides it, so all three always agree.
 */

export interface Passage {
  readonly choreography: Choreography;
  /** Milliseconds. */
  readonly duration: number;
}

const scratch = createShotFrame();

/** World-space camera position for a stop, at landscape framing. */
function cameraAt(stop: Stop, out: PointLike): PointLike {
  const definition = SECTION_DEFINITIONS[section(stop.section).index];
  if (!definition) return out;
  definition.stage.frame(stop.step, 'wide', scratch);
  const [ax, ay, az] = definition.stage.anchor;
  out.x = scratch.position[0] + ax;
  out.y = scratch.position[1] + ay;
  out.z = scratch.position[2] + az;
  return out;
}

const from = { x: 0, y: 0, z: 0 };
const to = { x: 0, y: 0, z: 0 };

/** Flight duration (ms) for a distance: grows with √distance, within bounds. */
export function flightDuration(distance: number): number {
  const { base, perUnit, min, max } = flight.duration;
  return Math.min(Math.max(base + perUnit * Math.sqrt(distance), min), max);
}

/** Whether a section change skips sections — and so pulls back to reveal the environment. */
export function isDistant(a: SectionId, b: SectionId): boolean {
  return Math.abs(section(a).index - section(b).index) > 1;
}

export function passage(start: Stop, end: Stop, reduced: boolean): Passage {
  if (start.section === end.section) {
    return { choreography: 'step', duration: (reduced ? reducedDurations : durations).step };
  }
  if (reduced) return { choreography: 'cut', duration: reducedDurations.cut };
  cameraAt(start, from);
  cameraAt(end, to);
  const distance = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z);
  return { choreography: 'travel', duration: flightDuration(distance) };
}

/**
 * The arc of a flight from `start` to `end`, written into `out` (world units, the
 * offset at mid-flight). The camera swings away from the world's central axis and
 * upward — back from the structure — perpendicular to its travel, so the arc bends
 * the path rather than lengthening it. Distant flights pull back much further.
 */
export function flightArc(
  start: PointLike,
  end: PointLike,
  distant: boolean,
  out: PointLike,
): void {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dz = end.z - start.z;
  const distance = Math.hypot(dx, dy, dz);
  out.x = 0;
  out.y = 0;
  out.z = 0;
  if (distance < 1e-3) return;

  const mx = (start.x + end.x) / 2;
  const mz = (start.z + end.z) / 2;
  const radial = Math.hypot(mx, mz);
  // The world's axis is vertical through the origin (see WORLD); away from it is "back".
  let lx = radial > 1e-3 ? mx / radial : 0;
  let ly = 0.6;
  let lz = radial > 1e-3 ? mz / radial : 1;
  const ux = dx / distance;
  const uy = dy / distance;
  const uz = dz / distance;
  const along = lx * ux + ly * uy + lz * uz;
  lx -= along * ux;
  ly -= along * uy;
  lz -= along * uz;

  const ratio = distant ? flight.arc.distant : flight.arc.adjacent;
  const magnitude = Math.min(distance * ratio, flight.arc.max);
  const length = Math.hypot(lx, ly, lz);
  if (length < 1e-3) {
    out.y = magnitude;
    return;
  }
  out.x = (lx / length) * magnitude;
  out.y = (ly / length) * magnitude;
  out.z = (lz / length) * magnitude;
}
