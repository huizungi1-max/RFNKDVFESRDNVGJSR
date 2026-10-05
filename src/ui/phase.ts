import type { SectionId } from '@/content/schema';
import { useNavigation, type NavigationState } from '@/navigation/store';

/**
 * Presentation phase of a piece of interface, derived from navigation — the only
 * way the interface learns what to show. CSS animates between phases
 * (ui/phase.module.css), so DOM motion runs on the compositor and reverses
 * smoothly when a transition is interrupted.
 */
export type Phase = 'active' | 'entering' | 'exiting' | 'inactive';

export function sectionPhase(state: NavigationState, id: SectionId): Phase {
  const { current, transition } = state;
  const moving = transition?.kind === 'section';
  if (current.section === id) return moving ? 'entering' : 'active';
  if (moving && transition.from.section === id) return 'exiting';
  return 'inactive';
}

export function stepPhase(state: NavigationState, id: SectionId, step: number): Phase {
  const { current, transition } = state;
  if (current.section !== id) return current.step === step ? 'active' : 'inactive';
  const moving = transition?.kind === 'step';
  if (current.step === step) return moving ? 'entering' : 'active';
  if (moving && transition.from.step === step) return 'exiting';
  return 'inactive';
}

export function useSectionPhase(id: SectionId): Phase {
  return useNavigation((state) => sectionPhase(state, id));
}

export function useStepPhase(id: SectionId, step: number): Phase {
  return useNavigation((state) => stepPhase(state, id, step));
}
