import { setConsoleFunction } from 'three';

/**
 * three.js messages that are known, benign, and not actionable from application
 * code. Every entry documents its cause and the condition for removing it.
 */
const SUPPRESSED_MESSAGES: readonly string[] = [
  // three r183 deprecated THREE.Clock in favour of THREE.Timer, but
  // @react-three/fiber v9 still constructs a Clock for each root. Remove once
  // the installed @react-three/fiber no longer does.
  'THREE.Clock: This module has been deprecated',
];

/**
 * Routes three.js console output through a filter that drops the messages above
 * and forwards everything else unchanged.
 */
export function installThreeLogFilter(): void {
  setConsoleFunction((type, message, ...params) => {
    if (SUPPRESSED_MESSAGES.some((prefix) => message.startsWith(prefix))) return;
    console[type](message, ...params);
  });
}
