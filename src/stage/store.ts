import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

import type { SectionId } from '@/content/schema';
import { environmentStore } from '@/environment/store';
import { SECTIONS } from '@/navigation/structure';

/**
 * Status of the WebGL stage, owned outside the (lazily loaded) stage so the
 * interface can adapt before, during, and without it.
 *
 *   unsupported — no WebGL 2: the flat presentation from the start
 *   loading     — runtime chunk, context, or first frame pending
 *   ready       — rendering
 *   suspended   — GPU context lost; waiting for the browser to restore it
 *   failed      — unrecoverable: the flat presentation takes over
 */
export type StageStatus = 'unsupported' | 'loading' | 'ready' | 'suspended' | 'failed';

/** Lifecycle of one section's scene module and assets. */
export type SceneStatus = 'idle' | 'loading' | 'ready' | 'failed';

export interface StageState {
  readonly status: StageStatus;
  readonly reason: string | null;
  /** GPU renderer string, once a context exists. */
  readonly gpu: string | null;
  readonly scenes: Readonly<Record<SectionId, SceneStatus>>;
}

interface StageActions {
  setStatus(status: StageStatus, reason?: string): void;
  setGpu(gpu: string): void;
  setScene(id: SectionId, status: SceneStatus): void;
}

const TERMINAL: ReadonlySet<StageStatus> = new Set(['unsupported', 'failed']);

export const stageStore = createStore<StageState & StageActions>()((set, get) => ({
  status: environmentStore.getState().webgl2 ? 'loading' : 'unsupported',
  reason: environmentStore.getState().webgl2 ? null : 'WebGL 2 is not available',
  gpu: null,
  scenes: Object.fromEntries(SECTIONS.map(({ id }) => [id, 'idle'])) as Record<
    SectionId,
    SceneStatus
  >,

  setStatus: (status, reason) => {
    if (TERMINAL.has(get().status) || get().status === status) return;
    set({ status, reason: reason ?? null });
  },
  setGpu: (gpu) => set({ gpu }),
  setScene: (id, status) => {
    if (get().scenes[id] !== status) set({ scenes: { ...get().scenes, [id]: status } });
  },
}));

export function useStage<T>(selector: (state: StageState) => T): T {
  return useStore(stageStore, selector);
}

/** Whether the flat (non-3D) presentation is in effect. */
export function isFlat(status: StageStatus): boolean {
  return TERMINAL.has(status);
}
