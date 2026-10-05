import type { MouseEvent } from 'react';

import type { SectionId } from '@/content/schema';
import { navigationStore } from '@/navigation/store';

/** Plain primary clicks navigate in place; modified clicks keep native link behaviour. */
export function isPlainClick(event: MouseEvent): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

/** Click handler for links that select a section (recorded in history). */
export function selectSection(event: MouseEvent, id: SectionId): void {
  if (!isPlainClick(event)) return;
  event.preventDefault();
  navigationStore.getState().goTo(id, { cause: 'select' });
}
