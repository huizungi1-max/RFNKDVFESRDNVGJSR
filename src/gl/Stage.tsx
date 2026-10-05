import { Canvas, advance, useStore, useThree } from '@react-three/fiber';
import { useEffect } from 'react';

import { QUALITY } from '@/environment/quality';
import { useEnvironment } from '@/environment/store';
import { ticker } from '@/runtime/ticker';
import { stageStore } from '@/stage/store';

import { installThreeLogFilter } from './logging';
import { configureRenderer, createRenderer } from './renderer';
import { World } from './World';

installThreeLogFilter();

// The stage is fixed to the viewport, so scrolling never moves its bounds;
// skip the scroll listener the canvas would otherwise attach.
const RESIZE_OPTIONS = { scroll: false } as const;

/** How long a lost GPU context may take to return before the flat presentation takes over (ms). */
const CONTEXT_RESTORE_TIMEOUT_MS = 5000;

const describe = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * Renders the stage from the application clock — one loop for the whole app,
 * so input, simulation and rendering happen in a fixed order and the stage
 * sleeps when nothing moves — and reports the stage's health.
 */
function StageDriver() {
  const gl = useThree((state) => state.gl);
  const store = useStore();

  useEffect(() => {
    let seconds = 0;
    let firstFrame = true;
    let warned = false;
    return ticker.add('render', (tick) => {
      if (stageStore.getState().status === 'suspended') return false;
      seconds += tick.delta;
      try {
        advance(seconds);
      } catch (error) {
        stageStore.getState().setStatus('failed', describe(error));
        return false;
      }
      // Invariant: react-three-fiber renders the world. A frame callback with a
      // positive priority silently takes rendering over — never intended here.
      if (import.meta.env.DEV && !warned && store.getState().internal.priority > 0) {
        warned = true;
        console.error('[stage] a useFrame callback with priority > 0 has disabled rendering');
      }
      if (firstFrame) {
        firstFrame = false;
        stageStore.getState().setStatus('ready');
      }
      return false;
    });
  }, [store]);

  // New size or resolution: draw a frame to match.
  useEffect(
    () =>
      store.subscribe((state, previous) => {
        if (state.size !== previous.size || state.viewport.dpr !== previous.viewport.dpr) {
          ticker.wake();
        }
      }),
    [store],
  );

  useEffect(() => {
    const canvas = gl.domElement;
    let timeout = 0;
    const onLost = () => {
      stageStore.getState().setStatus('suspended', 'GPU context lost');
      timeout = window.setTimeout(
        () => stageStore.getState().setStatus('failed', 'GPU context was not restored'),
        CONTEXT_RESTORE_TIMEOUT_MS,
      );
    };
    const onRestored = () => {
      window.clearTimeout(timeout);
      stageStore.getState().setStatus('ready');
      ticker.wake();
    };
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);
    return () => {
      window.clearTimeout(timeout);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
    };
  }, [gl]);

  return null;
}

/**
 * The persistent WebGL stage. It mounts once for the lifetime of the app:
 * scene content changes inside it, the canvas and its context never do.
 */
export function Stage() {
  const quality = useEnvironment((state) => QUALITY[state.tier]);
  return (
    <Canvas
      frameloop="never"
      dpr={quality.dpr}
      gl={createRenderer}
      onCreated={configureRenderer}
      resize={RESIZE_OPTIONS}
    >
      <StageDriver />
      <World />
    </Canvas>
  );
}
