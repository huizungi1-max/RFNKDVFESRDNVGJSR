import type { Direction } from '@/navigation/model';

/** What the visitor asked for, independent of the device that asked. */
export type Intent =
  /** Along the journey: scroll, vertical swipe, ↑/↓. */
  | { readonly kind: 'linear'; readonly direction: Direction }
  /** Within the current section: horizontal swipe, ←/→. */
  | { readonly kind: 'within'; readonly direction: Direction }
  | { readonly kind: 'edge'; readonly edge: 'first' | 'last' };

export type Axis = 'x' | 'y';

export function intentForAxis(axis: Axis, direction: Direction): Intent {
  return axis === 'y' ? { kind: 'linear', direction } : { kind: 'within', direction };
}
