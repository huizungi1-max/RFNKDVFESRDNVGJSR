import { startEnvironment } from '@/environment/store';
import { startInput } from '@/input/controller';
import { startNavigationClock } from '@/navigation/store';
import { startUrlSync } from '@/navigation/url';
import { ticker } from '@/runtime/ticker';

import { syncDocumentState } from './documentState';

/**
 * Starts the application systems, in dependency order, before the first render:
 * the clock, the device profile, navigation (placed from the URL), input, and the
 * state → CSS bridge. Everything here lives for the page's lifetime.
 */
export function boot(): void {
  ticker.attach();
  startEnvironment();
  startUrlSync();
  startNavigationClock();
  startInput();
  syncDocumentState();
}
