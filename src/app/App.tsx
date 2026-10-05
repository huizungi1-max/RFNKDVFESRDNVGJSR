import { Suspense, lazy } from 'react';

import { useEnvironment } from '@/environment/store';
import { StageHost } from '@/stage/StageHost';
import { Interface } from '@/ui/Interface';

const DebugHud = lazy(() => import('@/ui/debug/DebugHud'));

/**
 * Composition root: the persistent WebGL stage beneath the semantic interface.
 * Both are views of the same state; neither owns navigation.
 */
export function App() {
  const hud = useEnvironment((state) => state.debug.has('hud'));
  return (
    <>
      <StageHost />
      <Interface />
      {hud && (
        <Suspense fallback={null}>
          <DebugHud />
        </Suspense>
      )}
    </>
  );
}
