import { SECTIONS, type SectionStructure } from '@/navigation/structure';

import { horizontalFov } from './framing';
import type { LightingMood, SectionDefinition, SectionStage, ShotFrame, Vec3 } from './types';

/**
 * Where each section lives in the shared world and how the camera frames it.
 *
 * STRUCTURAL: the layout establishes scale and spatial relationships only. The
 * sections spiral down around a vertical axis through the origin — each a distinct
 * place, far from the next, viewed from its own direction — so every transition is
 * a substantial journey with a real change of perspective. Project stages are
 * stations along a rail. Each section's own part replaces its entry and scene.
 */
export const WORLD = {
  /** Distance of section anchors from the central axis. */
  radius: 46,
  /** Angle between consecutive sections around the axis (degrees). */
  turn: 52,
  /** Height lost between consecutive sections. */
  drop: 26,
} as const;

/** Camera stand-off from what it frames, and height above it. */
const SHOT = { distance: 15, height: 3.5, fov: 34 } as const;
/** Spacing between project stations along the Projects rail. */
const STATION_SPACING = 18;
const LANDSCAPE = 16 / 9;

const NEUTRAL_MOOD: LightingMood = { exposure: 1, key: 1.6, ambient: 0.35 };

interface Placement {
  readonly anchor: Vec3;
  /** Horizontal unit vector from the axis through the anchor. */
  readonly outward: Vec3;
  /** Horizontal unit vector to the camera's right when facing the anchor. */
  readonly tangent: Vec3;
}

function placementAt(index: number): Placement {
  const angle = (index * WORLD.turn * Math.PI) / 180;
  const outward: Vec3 = [Math.sin(angle), 0, Math.cos(angle)];
  return {
    anchor: [outward[0] * WORLD.radius, -index * WORLD.drop, outward[2] * WORLD.radius],
    outward,
    tangent: [outward[2], 0, -outward[0]],
  };
}

function write(out: Vec3, x: number, y: number, z: number): void {
  out[0] = x;
  out[1] = y;
  out[2] = z;
}

/**
 * Frames a point from outside the spiral. Single-view sections frame their anchor;
 * stepped sections place one station per step along the tangent, centred on the
 * anchor, and the camera rides the rail with the continuous step position.
 */
function railFrame(placement: Placement, steps: number): SectionStage['frame'] {
  const { outward, tangent } = placement;
  const minHorizontalFov = horizontalFov(SHOT.fov, LANDSCAPE);
  const centre = (steps - 1) / 2;
  return (step, _layout, out: ShotFrame) => {
    const offset = (step - centre) * STATION_SPACING;
    const tx = tangent[0] * offset;
    const tz = tangent[2] * offset;
    write(out.target, tx, 0, tz);
    write(
      out.position,
      tx + outward[0] * SHOT.distance,
      SHOT.height,
      tz + outward[2] * SHOT.distance,
    );
    out.fov = SHOT.fov;
    out.minHorizontalFov = minHorizontalFov;
    out.parallax = 0;
  };
}

function structuralStage(structure: SectionStructure): SectionStage {
  const placement = placementAt(structure.index);
  return {
    anchor: placement.anchor,
    frame: railFrame(placement, structure.steps),
    mood: NEUTRAL_MOOD,
  };
}

export const SECTION_DEFINITIONS: readonly SectionDefinition[] = SECTIONS.map((structure) => ({
  id: structure.id,
  stage: structuralStage(structure),
  scene: null,
}));

export function createShotFrame(): ShotFrame {
  return { position: [0, 0, 0], target: [0, 0, 0], fov: 0, minHorizontalFov: 0, parallax: 0 };
}
