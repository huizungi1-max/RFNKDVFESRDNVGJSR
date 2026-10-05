import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

import type { SectionId } from '@/content/schema';
import { environmentStore } from '@/environment/store';
import { ticker } from '@/runtime/ticker';
import { passage } from '@/sections/passage';

import {
  clampStep,
  directionBetween,
  linearTarget,
  sameStop,
  withinTarget,
  type Direction,
  type NavigationCause,
  type Stop,
  type Transition,
} from './model';
import { SECTIONS, firstSection, lastSection, section } from './structure';

/**
 * The single source of truth for where the visitor is. Every system — camera,
 * scenes, interface, URL, announcements — derives from this state; none decides
 * position on its own.
 *
 * `current` is the destination: it changes the instant an intent is accepted,
 * and the stage animates toward it. A new intent mid-transition simply replaces
 * the destination; the motion layer retargets from wherever it is.
 */
export interface NavigationState {
  readonly current: Stop;
  /** Last step visited in each section, by section index. */
  readonly remembered: readonly number[];
  /** The transition in flight, or null when settled. */
  readonly transition: Transition | null;
}

interface NavigationActions {
  /** The linear journey: scroll, swipe, ↑/↓, next. */
  advance(direction: Direction, cause: NavigationCause): boolean;
  /** Within the current section only: ←/→, step controls. */
  advanceWithin(direction: Direction, cause: NavigationCause): boolean;
  goTo(id: SectionId, options?: { step?: number; cause?: NavigationCause }): boolean;
  goToEdge(edge: 'first' | 'last', cause: NavigationCause): boolean;
  /** Places the experience at a stop without a transition (boot, deep links). */
  place(stop: Stop): void;
  /** Marks the transition finished; ignored if a newer one has started. */
  settle(id: number): void;
}

export type NavigationStore = NavigationState & NavigationActions;

let transitionIds = 0;

export const navigationStore = createStore<NavigationStore>()((set, get) => {
  const remember = (stop: Stop): readonly number[] => {
    const remembered = get().remembered.slice();
    remembered[section(stop.section).index] = stop.step;
    return remembered;
  };

  const navigate = (to: Stop, cause: NavigationCause): boolean => {
    const from = get().current;
    if (sameStop(from, to)) return false;
    const { choreography, duration } = passage(from, to, environmentStore.getState().reducedMotion);
    set({
      current: to,
      remembered: remember(to),
      transition: {
        id: (transitionIds += 1),
        kind: from.section === to.section ? 'step' : 'section',
        from,
        to,
        direction: directionBetween(from, to),
        choreography,
        cause,
        startedAt: performance.now(),
        duration,
      },
    });
    ticker.wake();
    return true;
  };

  return {
    current: { section: firstSection().id, step: 0 },
    remembered: SECTIONS.map(() => 0),
    transition: null,

    advance: (direction, cause) => {
      const { current, remembered } = get();
      const to = linearTarget(current, remembered, direction);
      return to ? navigate(to, cause) : false;
    },

    advanceWithin: (direction, cause) => {
      const to = withinTarget(get().current, direction);
      return to ? navigate(to, cause) : false;
    },

    goTo: (id, { step, cause = 'control' } = {}) => {
      const target = section(id);
      const resolved = clampStep(id, step ?? get().remembered[target.index] ?? 0);
      return navigate({ section: id, step: resolved }, cause);
    },

    goToEdge: (edge, cause) =>
      get().goTo(edge === 'first' ? firstSection().id : lastSection().id, { cause }),

    place: (stop) => set({ current: stop, remembered: remember(stop), transition: null }),

    settle: (id) => {
      if (get().transition?.id === id) set({ transition: null });
    },
  };
});

export function useNavigation<T>(selector: (state: NavigationState) => T): T {
  return useStore(navigationStore, selector);
}

/** Settles transitions on the application clock. Returns the cleanup function. */
export function startNavigationClock(): () => void {
  return ticker.add('update', (tick) => {
    const { transition, settle } = navigationStore.getState();
    if (!transition) return false;
    if (tick.time - transition.startedAt < transition.duration) return true;
    settle(transition.id);
    return false;
  });
}
