import { useFrame, useThree } from '@react-three/fiber';
import {
  Suspense,
  lazy,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type LazyExoticComponent,
  type RefObject,
} from 'react';
import type { Group } from 'three';

import type { SectionId } from '@/content/schema';
import { QUALITY } from '@/environment/quality';
import { useEnvironment } from '@/environment/store';
import { useNavigation } from '@/navigation/store';
import { SECTION_COUNT, section } from '@/navigation/structure';
import { ticker } from '@/runtime/ticker';
import { SECTION_DEFINITIONS } from '@/sections/registry';
import type { SceneLoader, SceneProps, SectionDefinition } from '@/sections/types';
import { ErrorBoundary } from '@/stage/ErrorBoundary';
import { stageStore, useStage } from '@/stage/store';

import { choreographer } from '../choreographer';

/** Sections leaving residency stay mounted this long, so quick returns are instant (ms). */
const RESIDENCY_GRACE_MS = 20_000;
/** Reveal below which a section's group is not rendered at all. */
const VISIBLE_EPSILON = 0.001;
const VISIBILITY_FRAME_PRIORITY = -80;

type SceneComponent = LazyExoticComponent<ComponentType<SceneProps>>;

const loadDebugScene: SceneLoader = () => import('../debug/DebugScene');

function loaderFor(definition: SectionDefinition, debug: boolean): SceneLoader | null {
  return definition.scene ?? (debug ? loadDebugScene : null);
}

/** Lazy scene components, created once per loader. Nothing is fetched until rendered. */
const sceneComponents = new Map<SceneLoader, SceneComponent>(
  [...SECTION_DEFINITIONS.flatMap(({ scene }) => (scene ? [scene] : [])), loadDebugScene].map(
    (loader) => [loader, lazy(loader)],
  ),
);

function around(current: number, radius: number): ReadonlySet<number> {
  const indices = new Set<number>();
  for (
    let i = Math.max(0, current - radius);
    i <= Math.min(SECTION_COUNT - 1, current + radius);
    i++
  ) {
    indices.add(i);
  }
  return indices;
}

function union(base: ReadonlySet<number>, extra: ReadonlySet<number>): ReadonlySet<number> {
  for (const index of extra) {
    if (!base.has(index)) return new Set([...base, ...extra]);
  }
  return base;
}

/**
 * Which sections are mounted. The current section loads first and alone; its
 * neighbours (by tier) join once it is ready. Sections that fall out of range
 * are released after a grace period, disposing their GPU resources.
 */
function useResidency(
  current: number,
  radius: number,
  currentSettled: boolean,
): ReadonlySet<number> {
  const span = currentSettled ? radius : 0;
  const wanted = useMemo(() => around(current, span), [current, span]);
  const [resident, setResident] = useState(wanted);
  const [lastWanted, setLastWanted] = useState(wanted);
  if (wanted !== lastWanted) {
    // Adjusted during render: newly wanted sections join at once; none leave yet.
    setLastWanted(wanted);
    setResident(union(resident, wanted));
  }
  useEffect(() => {
    const release = window.setTimeout(() => setResident(wanted), RESIDENCY_GRACE_MS);
    return () => window.clearTimeout(release);
  }, [wanted]);
  return resident;
}

/** Section indices ordered by distance from `current`; ahead before behind. */
function nearestFirst(current: number): number[] {
  const order = [current];
  for (let distance = 1; order.length < SECTION_COUNT; distance++) {
    if (current + distance < SECTION_COUNT) order.push(current + distance);
    if (current - distance >= 0) order.push(current - distance);
  }
  return order;
}

type IdleScheduler = Partial<Pick<Window, 'requestIdleCallback' | 'cancelIdleCallback'>>;

/** Runs `callback` when the main thread is idle (timer fallback where unsupported). */
const idle = (callback: () => void): (() => void) => {
  const scheduler: IdleScheduler = window;
  if (scheduler.requestIdleCallback && scheduler.cancelIdleCallback) {
    const { cancelIdleCallback } = scheduler;
    const handle = scheduler.requestIdleCallback(callback, { timeout: 2000 });
    return () => cancelIdleCallback(handle);
  }
  const handle = window.setTimeout(callback, 50);
  return () => window.clearTimeout(handle);
};

/** Warms scene modules beyond residency during idle time, nearest first. */
function usePreloading(current: number, debug: boolean, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const order = nearestFirst(current);
    let cancel = () => {};
    let stopped = false;
    const next = (position: number) => {
      const definition = SECTION_DEFINITIONS[order[position] ?? -1];
      if (stopped || !definition) return;
      const loader = loaderFor(definition, debug);
      cancel = idle(() => {
        if (!loader) return next(position + 1);
        loader().then(
          (module) => {
            module.preload?.();
            next(position + 1);
          },
          () => next(position + 1),
        );
      });
    };
    next(0);
    return () => {
      stopped = true;
      cancel();
    };
  }, [current, debug, enabled]);
}

/** Compiles a freshly mounted scene off the critical path, then reveals it. */
function ReadyGate({
  id,
  index,
  group,
}: {
  id: SectionId;
  index: number;
  group: RefObject<Group | null>;
}) {
  const get = useThree((state) => state.get);
  useEffect(() => {
    const target = group.current;
    if (!target) return;
    let live = true;
    const { gl, camera, scene } = get();
    // Parallel compilation where the GPU driver offers it; otherwise compile now,
    // while the scene is still hidden, rather than on its first visible frame.
    const compiled = gl.extensions.has('KHR_parallel_shader_compile')
      ? gl.compileAsync(target, camera, scene)
      : Promise.resolve(gl.compile(target, camera, scene));
    compiled.then(
      () => {
        if (!live) return;
        choreographer.setReady(index, true);
        stageStore.getState().setScene(id, 'ready');
        ticker.wake();
      },
      () => {
        if (live) stageStore.getState().setScene(id, 'failed');
      },
    );
    return () => {
      live = false;
      choreographer.setReady(index, false);
    };
  }, [get, group, id, index]);
  return null;
}

interface SceneSlotProps {
  definition: SectionDefinition;
  index: number;
  Scene: SceneComponent;
}

function SceneSlot({ definition, index, Scene }: SceneSlotProps) {
  const group = useRef<Group>(null);
  const [x, y, z] = definition.stage.anchor;

  useLayoutEffect(() => {
    if (group.current) group.current.visible = false;
    stageStore.getState().setScene(definition.id, 'loading');
    return () => stageStore.getState().setScene(definition.id, 'idle');
  }, [definition.id]);

  // Sections are places in one world: visible whenever loaded, wherever the camera
  // is — the camera's journey is the transition. Off-screen content is culled.
  useFrame(() => {
    if (group.current) group.current.visible = (choreographer.reveal[index] ?? 0) > VISIBLE_EPSILON;
  }, VISIBILITY_FRAME_PRIORITY);

  return (
    <group ref={group} position={[x, y, z]}>
      <ErrorBoundary onError={() => stageStore.getState().setScene(definition.id, 'failed')}>
        <Suspense fallback={null}>
          <Scene section={definition.id} />
          <ReadyGate id={definition.id} index={index} group={group} />
        </Suspense>
      </ErrorBoundary>
    </group>
  );
}

/**
 * Owns the lifecycle of every section's scene: what is mounted (residency by
 * tier), in what order things load, compilation before reveal, and isolation — a
 * failing scene marks itself failed and nothing else notices. Scenes themselves
 * only render their content.
 */
export function SceneDirector() {
  const currentId = useNavigation((state) => state.current.section);
  const radius = useEnvironment((state) => QUALITY[state.tier].residency);
  const debug = useEnvironment((state) => state.debug.has('stage'));
  const current = section(currentId).index;
  const currentDefinition = SECTION_DEFINITIONS[current];
  const hasScene = currentDefinition ? loaderFor(currentDefinition, debug) !== null : false;
  const currentStatus = useStage((state) => state.scenes[currentId]);
  const settled = !hasScene || currentStatus === 'ready' || currentStatus === 'failed';
  const resident = useResidency(current, radius, settled);
  usePreloading(current, debug, settled);

  return (
    <>
      {SECTION_DEFINITIONS.map((definition, index) => {
        const loader = loaderFor(definition, debug);
        const Scene = loader ? sceneComponents.get(loader) : undefined;
        return Scene && resident.has(index) ? (
          <SceneSlot key={definition.id} definition={definition} index={index} Scene={Scene} />
        ) : null;
      })}
    </>
  );
}
