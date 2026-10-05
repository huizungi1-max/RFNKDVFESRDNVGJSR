import type { ComponentType } from 'react';

import type { SectionId } from '@/content/schema';
import type { LayoutClass } from '@/environment/profile';

/**
 * Contracts between a section and the shared stage. Main-chunk safe: plain
 * data and types only — three.js stays inside `src/gl` and section `scene/`
 * folders.
 */

export type Vec3 = [x: number, y: number, z: number];

/** Camera framing written by a section, in its local space (relative to its anchor). */
export interface ShotFrame {
  readonly position: Vec3;
  readonly target: Vec3;
  /** Vertical field of view (degrees) for landscape viewports. */
  fov: number;
  /** Narrowest horizontal field of view (degrees) preserved on tall viewports. */
  minHorizontalFov: number;
  /**
   * Pointer parallax as a fraction of the shot distance; 0 (the default) keeps the
   * settled camera perfectly still. Opt in only where depth reads better for it.
   */
  parallax: number;
}

/** A section's contribution to the shared lighting, blended by activation. */
export interface LightingMood {
  readonly exposure: number;
  readonly key: number;
  readonly ambient: number;
}

export interface SectionStage {
  /** World-space origin of the section's environment. */
  readonly anchor: Readonly<Vec3>;
  /**
   * Framing for a continuous step position (e.g. 2.4 = between stages 3 and 4).
   * Runs every frame: write into `out`, never allocate.
   */
  frame(step: number, layout: LayoutClass, out: ShotFrame): void;
  readonly mood: LightingMood;
}

export interface SceneProps {
  readonly section: SectionId;
}

/** A section's lazily loaded 3D module. */
export interface SceneModule {
  readonly default: ComponentType<SceneProps>;
  /** Warms asset caches ahead of need; called by the director by priority. */
  readonly preload?: () => void;
}

export type SceneLoader = () => Promise<SceneModule>;

export interface SectionDefinition {
  readonly id: SectionId;
  readonly stage: SectionStage;
  /** `null` until the section's scene is built in its own part. */
  readonly scene: SceneLoader | null;
}
