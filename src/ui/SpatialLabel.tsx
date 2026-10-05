import { useLayoutEffect, useRef, type ReactNode } from 'react';

import { ticker } from '@/runtime/ticker';
import { spatial } from '@/stage/spatial';

import styles from './SpatialLabel.module.css';

interface SpatialLabelProps {
  /** Id of the anchor a scene publishes (see gl/hooks useSpatialAnchor). */
  anchor: string;
  children: ReactNode;
  className?: string;
}

/**
 * Interface text pinned to a point in the 3D world. It stays in the document
 * (readable, selectable, accessible); the stage positions it each frame and
 * hides it while its anchor is off-screen or its section is absent.
 */
export function SpatialLabel({ anchor, children, className }: SpatialLabelProps) {
  const element = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!element.current) return;
    const release = spatial.registerLabel(element.current, anchor);
    ticker.wake();
    return release;
  }, [anchor]);

  return (
    <div
      ref={element}
      className={className ? `${styles.label} ${className}` : styles.label}
      data-visible="false"
    >
      {children}
    </div>
  );
}
