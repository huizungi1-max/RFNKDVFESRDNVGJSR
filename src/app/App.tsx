import { Suspense, lazy } from 'react';

import { StageBoundary } from '@/gl/StageBoundary';

import styles from './App.module.css';

// The WebGL runtime (three.js + react-three-fiber) ships as its own chunk so the
// document shell can parse and paint without waiting for it.
const Stage = lazy(() => import('@/gl/Stage').then((module) => ({ default: module.Stage })));

/**
 * Composition root. Two layers: the persistent WebGL stage, fixed beneath, and
 * the semantic document interface above it. All readable content belongs to the
 * interface; the stage is presentational and hidden from assistive technology.
 */
export function App() {
  return (
    <div className={styles.root}>
      <div className={styles.stage} aria-hidden="true">
        <StageBoundary>
          <Suspense fallback={null}>
            <Stage />
          </Suspense>
        </StageBoundary>
      </div>
      <main id="main" className={styles.interface} />
    </div>
  );
}
