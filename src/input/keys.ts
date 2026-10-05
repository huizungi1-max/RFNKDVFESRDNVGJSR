import type { Intent } from './intent';

/**
 * Keyboard mapping. Global keys never steal input from text fields, and never
 * override keys a focused control needs (Space activates buttons; arrows belong
 * to sliders, tabs, menus). Auto-repeat is swallowed: one press, one transition.
 */

const LINEAR_FORWARD = new Set(['ArrowDown', 'PageDown']);
const LINEAR_BACK = new Set(['ArrowUp', 'PageUp']);

// Links are absent on purpose: Space never activates a link, it pages — as it does here.
const ACTIVATES_WITH_SPACE =
  'button, summary, select, [role="button"], [role="checkbox"], [role="switch"], [role="option"], [role="menuitem"], [role="tab"]';
const USES_ARROWS =
  'select, [role="slider"], [role="spinbutton"], [role="tablist"], [role="tab"], [role="listbox"], [role="option"], [role="menu"], [role="menubar"], [role="menuitem"], [role="radiogroup"], [role="radio"], [role="grid"], [role="tree"], [role="combobox"]';

function isEditable(element: Element): boolean {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) return true;
  return element instanceof HTMLElement && element.isContentEditable;
}

function intentForKey(event: KeyboardEvent): Intent | null {
  const { key } = event;
  if (LINEAR_FORWARD.has(key)) return { kind: 'linear', direction: 1 };
  if (LINEAR_BACK.has(key)) return { kind: 'linear', direction: -1 };
  if (key === ' ') return { kind: 'linear', direction: event.shiftKey ? -1 : 1 };
  if (key === 'ArrowRight') return { kind: 'within', direction: 1 };
  if (key === 'ArrowLeft') return { kind: 'within', direction: -1 };
  if (key === 'Home') return { kind: 'edge', edge: 'first' };
  if (key === 'End') return { kind: 'edge', edge: 'last' };
  return null;
}

/**
 * The intent for a key press, `'swallow'` for a navigation key that should do
 * nothing (auto-repeat), or null when the key isn't ours to handle.
 */
export function keyIntent(event: KeyboardEvent): Intent | 'swallow' | null {
  if (event.defaultPrevented || event.isComposing) return null;
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  const intent = intentForKey(event);
  if (!intent) return null;

  const target = event.target instanceof Element ? event.target : null;
  if (target) {
    if (isEditable(target)) return null;
    if (event.key === ' ' && target.closest(ACTIVATES_WITH_SPACE)) return null;
    if (event.key.startsWith('Arrow') && target.closest(USES_ARROWS)) return null;
  }
  return event.repeat ? 'swallow' : intent;
}
