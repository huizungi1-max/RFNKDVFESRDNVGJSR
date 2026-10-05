import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type DependencyList, type RefObject } from 'react';
import { Vector3, type Object3D } from 'three';

import type { SectionId } from '@/content/schema';
import { environmentStore } from '@/environment/store';
import { section } from '@/navigation/structure';
import { ticker } from '@/runtime/ticker';
import { spatial } from '@/stage/spatial';
import { stageStore } from '@/stage/store';

import { cameraState } from './camera/state';
import { choreographer } from './choreographer';

/**
 * The toolkit section scenes are written with. Scenes never touch the camera,
 * the clock, or navigation directly — they read their section's motion here, and
 * defer to the camera (motion hierarchy level 1).
 */

export interface SectionFrame {
  /** How engaged the section is, 0–1: drive the section's major transformation with it. */
  activation: number;
  /** Load reveal, 0–1: emerge with it instead of popping in. */
  reveal: number;
  /** Continuous step position (Projects: 0 … 7). */
  step: number;
  /**
   * Camera movement intensity, 0–1. Secondary and detail motion should hold while
   * this is high, so nothing competes with the camera.
   */
  camera: number;
  /** The camera is settled on this section — the moment for the composition to rest. */
  arrived: boolean;
  /** Seconds since the previous frame. */
  delta: number;
  /** Seconds of stage time. */
  elapsed: number;
  reduced: boolean;
}

/**
 * Per-frame callback for a section's scene, skipped while the scene is hidden.
 * Return `true` only for motion that must continue on its own (rare by design —
 * a settled composition is still); otherwise the frame loop sleeps. A callback
 * that throws is disabled and its section marked failed; the stage carries on.
 *
 * `priority` orders callbacks and must stay ≤ 0: in react-three-fiber a positive
 * priority takes over rendering.
 */
export function useSectionFrame(
  id: SectionId,
  callback: (frame: SectionFrame) => boolean | void,
  priority = 0,
): void {
  const index = section(id).index;
  // One reused object: frame callbacks never allocate.
  const frame = useRef<SectionFrame>({
    activation: 0,
    reveal: 0,
    step: 0,
    camera: 0,
    arrived: false,
    delta: 0,
    elapsed: 0,
    reduced: false,
  });
  const disabled = useRef(false);

  useFrame((state, delta) => {
    if (disabled.current) return;
    const reveal = choreographer.reveal[index] ?? 0;
    if (reveal <= 0) return;
    const current = frame.current;
    current.activation = choreographer.activation[index] ?? 0;
    current.reveal = reveal;
    current.step = choreographer.step[index] ?? 0;
    current.camera = cameraState.intensity;
    current.arrived = cameraState.mode === 'rail' && choreographer.focus === index;
    current.delta = delta;
    current.elapsed = state.clock.elapsedTime;
    current.reduced = environmentStore.getState().reducedMotion;
    try {
      if (callback(current) === true) ticker.wake();
    } catch (error) {
      disabled.current = true;
      stageStore.getState().setScene(id, 'failed');
      console.error(`[stage] ${id}: frame callback disabled after an error`, error);
    }
  }, priority);
}

/**
 * A GPU resource created once and disposed when the component unmounts — for
 * geometries, materials and textures created imperatively rather than as JSX.
 */
export function useDisposable<T extends { dispose(): void }>(
  create: () => T,
  deps: DependencyList,
): T {
  // oxlint-disable-next-line react/exhaustive-deps -- the caller owns the dependency list
  const resource = useMemo(create, deps);
  useEffect(() => () => resource.dispose(), [resource]);
  return resource;
}

const anchorScratch = new Vector3();

/** Publishes an object's world position as a spatial anchor for DOM labels. */
export function useSpatialAnchor(
  id: string,
  owner: SectionId,
  object: RefObject<Object3D | null>,
): void {
  useEffect(
    () =>
      spatial.registerAnchor(id, {
        section: owner,
        read(out) {
          const target = object.current;
          if (!target) return;
          target.getWorldPosition(anchorScratch);
          out.x = anchorScratch.x;
          out.y = anchorScratch.y;
          out.z = anchorScratch.z;
        },
      }),
    [id, owner, object],
  );
}
