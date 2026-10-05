import { environmentStore } from '@/environment/store';
import { navigationStore } from '@/navigation/store';
import { isFlat, stageStore } from '@/stage/store';

/**
 * Mirrors application state onto `<html>` data attributes — the single bridge
 * from state to CSS. Stylesheets adapt to layout, input, motion, stage health and
 * transition timing by attribute; components never measure the device themselves.
 *
 *   data-layout        compact | medium | wide
 *   data-orientation   portrait | landscape
 *   data-pointer       fine | coarse
 *   data-hover         hover | none
 *   data-motion        full | reduced
 *   data-stage         loading | ready | suspended | flat
 *   data-section       the current section id
 *   data-choreography  travel | cut | step (only while a transition runs)
 */
export function syncDocumentState(): () => void {
  const root = document.documentElement;

  const set = (name: string, value: string | null) => {
    if (value === null) root.removeAttribute(name);
    else if (root.getAttribute(name) !== value) root.setAttribute(name, value);
  };

  const write = () => {
    const environment = environmentStore.getState();
    const navigation = navigationStore.getState();
    const stage = stageStore.getState();
    set('data-layout', environment.viewport.layout);
    set('data-orientation', environment.viewport.orientation);
    set('data-pointer', environment.pointer);
    set('data-hover', environment.hover ? 'hover' : 'none');
    set('data-motion', environment.reducedMotion ? 'reduced' : 'full');
    set('data-stage', isFlat(stage.status) ? 'flat' : stage.status);
    set('data-section', navigation.current.section);
    set('data-choreography', navigation.transition?.choreography ?? null);
  };

  write();
  const unsubscribe = [environmentStore, navigationStore, stageStore].map((store) =>
    store.subscribe(write),
  );
  return () => {
    for (const stop of unsubscribe) stop();
  };
}
