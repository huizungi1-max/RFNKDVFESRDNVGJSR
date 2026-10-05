import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

import {
  MEDIA,
  estimateTier,
  hasWebGL2,
  matchesMedia,
  readDebugFlags,
  readSaveData,
  readViewport,
  type MotionPreference,
  type PointerKind,
  type RenderTier,
  type Viewport,
} from './profile';
import { minTier } from './quality';

export interface EnvironmentState {
  readonly viewport: Viewport;
  readonly pointer: PointerKind;
  readonly hover: boolean;
  readonly systemReducedMotion: boolean;
  /** The visitor's explicit choice; 'system' follows the OS setting. */
  readonly motionPreference: MotionPreference;
  /** Resolved: whether motion is reduced. Every system reads this, never the media query. */
  readonly reducedMotion: boolean;
  readonly saveData: boolean;
  readonly webgl2: boolean;
  readonly tier: RenderTier;
  readonly debug: ReadonlySet<string>;
}

interface EnvironmentActions {
  setMotionPreference(preference: MotionPreference): void;
  /** Lowers the render tier; never raises it. */
  capTier(tier: RenderTier): void;
}

const MOTION_KEY = 'kp.motion';

function resolveReduced(preference: MotionPreference, system: boolean): boolean {
  return preference === 'system' ? system : preference === 'reduce';
}

function readStoredPreference(): MotionPreference {
  try {
    const value = window.localStorage.getItem(MOTION_KEY);
    return value === 'reduce' || value === 'full' ? value : 'system';
  } catch {
    return 'system';
  }
}

function initialState(): EnvironmentState {
  const pointer: PointerKind = matchesMedia(MEDIA.coarsePointer) ? 'coarse' : 'fine';
  const systemReducedMotion = matchesMedia(MEDIA.reducedMotion);
  const motionPreference = readStoredPreference();
  return {
    viewport: readViewport(),
    pointer,
    hover: matchesMedia(MEDIA.hover),
    systemReducedMotion,
    motionPreference,
    reducedMotion: resolveReduced(motionPreference, systemReducedMotion),
    saveData: readSaveData(),
    webgl2: hasWebGL2(),
    tier: estimateTier(pointer),
    debug: readDebugFlags(),
  };
}

export const environmentStore = createStore<EnvironmentState & EnvironmentActions>()(
  (set, get) => ({
    ...initialState(),
    setMotionPreference: (motionPreference) => {
      try {
        window.localStorage.setItem(MOTION_KEY, motionPreference);
      } catch {
        // Storage unavailable (privacy mode): the choice lasts for this visit.
      }
      set({
        motionPreference,
        reducedMotion: resolveReduced(motionPreference, get().systemReducedMotion),
      });
    },
    capTier: (tier) => set({ tier: minTier(get().tier, tier) }),
  }),
);

export function useEnvironment<T>(selector: (state: EnvironmentState) => T): T {
  return useStore(environmentStore, selector);
}

/** Keeps viewport and media preferences current. Returns the cleanup function. */
export function startEnvironment(): () => void {
  let frame = 0;
  const onResize = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const viewport = readViewport();
      const current = environmentStore.getState().viewport;
      if (viewport.width !== current.width || viewport.height !== current.height) {
        environmentStore.setState({ viewport });
      }
    });
  };

  const queries = [
    [
      MEDIA.reducedMotion,
      (matches: boolean) =>
        environmentStore.setState((state) => ({
          systemReducedMotion: matches,
          reducedMotion: resolveReduced(state.motionPreference, matches),
        })),
    ],
    [
      MEDIA.coarsePointer,
      (matches: boolean) => environmentStore.setState({ pointer: matches ? 'coarse' : 'fine' }),
    ],
    [MEDIA.hover, (matches: boolean) => environmentStore.setState({ hover: matches })],
  ] as const;

  const detach = queries.map(([query, apply]) => {
    const list = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => apply(event.matches);
    list.addEventListener('change', listener);
    return () => list.removeEventListener('change', listener);
  });

  window.addEventListener('resize', onResize);
  return () => {
    window.removeEventListener('resize', onResize);
    cancelAnimationFrame(frame);
    for (const remove of detach) remove();
  };
}
