import { SECTIONS, type SectionStructure } from '@/navigation/structure';

import { horizontalFov } from './framing';
import type { LightingMood, SectionDefinition, SectionStage, ShotFrame, Vec3 } from './types';

/**
 * Where each section lives in the shared world and how the camera frames it.
 *
 * STRUCTURAL: these anchors and shots only establish spatial relationships —
 * one continuous path descending into the system, each section a distinct place
 * on it, and the project stages as stations along a track. Each section's own
 * part replaces its entry and registers its scene.
 */

/** Offset between consecutive section anchors along the path. */
const PATH_STEP: Vec3 = [0, -14, -10];
/** Spacing between project stations along the Projects track. */
const STATION_SPACING = 7;
const LANDSCAPE = 16 / 9;

const NEUTRAL_MOOD: LightingMood = { exposure: 1, key: 1.6, ambient: 0.35 };

function anchorAt(index: number): Vec3 {
  return [PATH_STEP[0] * index, PATH_STEP[1] * index, PATH_STEP[2] * index];
}

function write(out: Vec3, x: number, y: number, z: number): void {
  out[0] = x;
  out[1] = y;
  out[2] = z;
}

/** A fixed framing of the anchor. */
function fixedFrame(position: Vec3, target: Vec3, fov: number): SectionStage['frame'] {
  const minHorizontalFov = horizontalFov(fov, LANDSCAPE);
  return (_step, _layout, out: ShotFrame) => {
    write(out.position, position[0], position[1], position[2]);
    write(out.target, target[0], target[1], target[2]);
    out.fov = fov;
    out.minHorizontalFov = minHorizontalFov;
  };
}

/** A framing that tracks along x with the continuous step: one station per step. */
function trackingFrame(position: Vec3, target: Vec3, fov: number): SectionStage['frame'] {
  const minHorizontalFov = horizontalFov(fov, LANDSCAPE);
  return (step, _layout, out: ShotFrame) => {
    const x = step * STATION_SPACING;
    write(out.position, position[0] + x, position[1], position[2]);
    write(out.target, target[0] + x, target[1], target[2]);
    out.fov = fov;
    out.minHorizontalFov = minHorizontalFov;
  };
}

function structuralStage(structure: SectionStructure): SectionStage {
  return {
    anchor: anchorAt(structure.index),
    frame:
      structure.steps > 1
        ? trackingFrame([0, 1.6, 10], [0, 0, 0], 36)
        : fixedFrame([0, 1.2, 11], [0, 0, 0], 36),
    mood: NEUTRAL_MOOD,
  };
}

export const SECTION_DEFINITIONS: readonly SectionDefinition[] = SECTIONS.map((structure) => ({
  id: structure.id,
  stage: structuralStage(structure),
  scene: null,
}));

/** Station positions (local to the section) for each step — e.g. for diagnostics. */
export function stationsOf(definition: SectionDefinition, steps: number): readonly Vec3[] {
  const frame: ShotFrame = { position: [0, 0, 0], target: [0, 0, 0], fov: 0, minHorizontalFov: 0 };
  return Array.from({ length: steps }, (_, step) => {
    definition.stage.frame(step, 'wide', frame);
    return [...frame.target];
  });
}
