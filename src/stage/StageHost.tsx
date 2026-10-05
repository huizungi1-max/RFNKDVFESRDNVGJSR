import { Suspense, lazy } from 'react';

import { ErrorBoundary } from './ErrorBoundary';
import styles from './StageHost.module.css';
import { isFlat, stageStore, useStage } from './store';

// three.js and react-three-fiber ship as separate chunks, fetched in parallel
// with the first paint; the interface never waits for them.
const Stage = lazy(() => import('@/gl/Stage').then((module) => ({ default: module.Stage })));

function reportFailure(error: unknown): void {
  stageStore.getState().setStatus('failed', error instanceof Error ? error.message : String(error));
}

/**
 * Hosts the WebGL stage beneath the interface. Without WebGL — or after an
 * unrecoverable failure — it renders nothing and the interface carries the
 * experience on its own.
 */
export function StageHost() {
  const status = useStage((state) => state.status);
  if (isFlat(status)) return null;
  return (
    <div className={styles.stage} data-status={status} aria-hidden="true">
      <ErrorBoundary onError={reportFailure}>
        <Suspense fallback={null}>
          <Stage />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
