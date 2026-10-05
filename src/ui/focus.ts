import { useEffect } from 'react';

import type { SectionId } from '@/content/schema';
import { navigationStore } from '@/navigation/store';

export function focusSectionHeading(id: SectionId): void {
  document
    .querySelector<HTMLElement>(`[data-section-heading="${id}"]`)
    ?.focus({ preventScroll: true });
}

/**
 * When a section leaves while focus is inside it (or focus is nowhere), focus
 * moves to the arriving section's heading — keyboard and screen-reader users are
 * never stranded in content that just became inert. Focus elsewhere (e.g. on
 * the navigation) is left alone.
 */
export function useFocusHandoff(): void {
  useEffect(
    () =>
      navigationStore.subscribe((state, previous) => {
        if (state.current.section === previous.current.section) return;
        const active = document.activeElement;
        const outgoing = document.getElementById(`section-${previous.current.section}`);
        const stranded =
          !active || active === document.body || (outgoing?.contains(active) ?? false);
        if (!stranded) return;
        // After React has committed the new phases (and lifted `inert`).
        requestAnimationFrame(() => focusSectionHeading(state.current.section));
      }),
    [],
  );
}
