import { sameStop, type Stop } from './model';
import { navigationStore } from './store';
import { SECTIONS, firstSection, section } from './structure';

/**
 * URL ↔ navigation. The hash mirrors the current stop (`#identity`,
 * `#projects/03`), so every view is linkable and survives reload. Gestures
 * replace the history entry — scrolling never floods Back — while direct
 * selection from the navigation pushes one.
 */

const pad = (n: number) => String(n).padStart(2, '0');

export function hashFor(stop: Stop): string {
  const target = section(stop.section);
  if (target.index === 0 && stop.step === 0) return '';
  return target.steps > 1 ? `#${target.id}/${pad(stop.step + 1)}` : `#${target.id}`;
}

/** An href for links: the hash, or the document itself for the first stop. */
export function hrefFor(stop: Stop): string {
  return hashFor(stop) || window.location.pathname + window.location.search;
}

export function stopFromHash(hash: string): Stop | null {
  const match = /^#([a-z]+)(?:\/(\d{1,2}))?$/.exec(hash);
  if (!match) return null;
  const target = SECTIONS.find((candidate) => candidate.id === match[1]);
  if (!target) return null;
  const step = match[2] === undefined ? 0 : Number(match[2]) - 1;
  return { section: target.id, step: Math.min(Math.max(step, 0), target.steps - 1) };
}

function write(stop: Stop, mode: 'push' | 'replace'): void {
  const url = window.location.pathname + window.location.search + hashFor(stop);
  if (mode === 'push') window.history.pushState(null, '', url);
  else window.history.replaceState(window.history.state, '', url);
}

const home = (): Stop => ({ section: firstSection().id, step: 0 });

/** Places the experience at the URL's stop, then keeps both in sync. */
export function startUrlSync(): () => void {
  const initial = stopFromHash(window.location.hash) ?? home();
  navigationStore.getState().place(initial);
  write(initial, 'replace');

  const unsubscribe = navigationStore.subscribe((state, previous) => {
    if (sameStop(state.current, previous.current)) return;
    const cause = state.transition?.cause;
    if (cause === 'url') return;
    write(state.current, cause === 'select' ? 'push' : 'replace');
  });

  const onLocation = () => {
    const stop = stopFromHash(window.location.hash) ?? home();
    navigationStore.getState().goTo(stop.section, { step: stop.step, cause: 'url' });
  };
  window.addEventListener('popstate', onLocation);
  window.addEventListener('hashchange', onLocation);

  return () => {
    unsubscribe();
    window.removeEventListener('popstate', onLocation);
    window.removeEventListener('hashchange', onLocation);
  };
}
