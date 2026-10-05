import { Canvas } from '@react-three/fiber';

import { installThreeLogFilter } from './logging';
import { CLEAR_COLOR, DPR_RANGE, configureRenderer, createRenderer } from './renderer';

installThreeLogFilter();

// The stage is fixed to the viewport, so scrolling never moves its bounds;
// skip the scroll listener the canvas would otherwise attach.
const RESIZE_OPTIONS = { scroll: false } as const;

/**
 * The persistent WebGL stage. It mounts once for the lifetime of the app:
 * scene content changes inside it, the canvas and its context never do.
 */
export function Stage() {
  return (
    <Canvas
      dpr={DPR_RANGE}
      gl={createRenderer}
      onCreated={configureRenderer}
      resize={RESIZE_OPTIONS}
    >
      <color attach="background" args={[CLEAR_COLOR]} />
    </Canvas>
  );
}
