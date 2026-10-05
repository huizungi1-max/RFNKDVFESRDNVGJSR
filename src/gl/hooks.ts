import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type DependencyList, type RefObject } from 'react';
import { Vector3, type Object3D } from 'three';

import type { SectionId } from '@/content/schema';
import { environmentStore } from '@/environment/store';
import { section } from '@/navigation/structure';
import { ticker } from '@/runtime/ticker';
import { spatial } from '@/stage/spatial';
import { stageStore } from '@/stage/store';

import { choreographer } from './choreographer';

/**
 * The toolkit section scenes are written with. Scenes never touch the camera,
 * the clock, or navigation directly — they read their section's motion here.
 */

export interface SectionFrame {
  /** Visible presence, 0–1. */
  presence: number;
  /** Continuous step position (Projects: 0 … 7). */
  step: number;
  /** Seconds since the previous frame. */
  delta: number;
  /** Seconds of stage time. */
  elapsed: number;
  reduced: boolean;
}

/**
 * Per-frame callback for a section's scene. Skipped while the section is absent,
 * so hidden scenes cost nothing. Return `true` while animating independently of
 * navigation (ambient motion) to keep frames coming. A callback that throws is
 * disabled and its section marked failed — the rest of the stage carries on.
 */
export function useSectionFrame(
  id: SectionId,
  callback: (frame: SectionFrame) => boolean | void,
  priority = 0,
): void {
  const index = section(id).index;
  // One reused object: frame callbacks never allocate.
  const frame = useRef<SectionFrame>({
    presence: 0,
    step: 0,
    delta: 0,
    elapsed: 0,
    reduced: false,
  });
  const disabled = useRef(false);

  useFrame((state, delta) => {
    if (disabled.current) return;
    const presence = choreographer.presence[index] ?? 0;
    if (presence <= 0) return;
    const current = frame.current;
    current.presence = presence;
    current.step = choreographer.step[index] ?? 0;
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
