import type { Plugin } from 'vite';

import { designTokensCss } from '../src/design/css.ts';

const MODULE_ID = 'virtual:design-tokens.css';
// The resolved id keeps the `.css` suffix so Vite's CSS pipeline processes it.
const RESOLVED_ID = `\0${MODULE_ID}`;

/**
 * Serves the design tokens (src/design) as CSS custom properties. The token
 * modules are config dependencies, so editing them restarts the dev server.
 */
export function designTokens(): Plugin {
  return {
    name: 'kp:design-tokens',
    resolveId(id) {
      return id === MODULE_ID ? RESOLVED_ID : undefined;
    },
    load(id) {
      return id === RESOLVED_ID ? designTokensCss() : undefined;
    },
  };
}
