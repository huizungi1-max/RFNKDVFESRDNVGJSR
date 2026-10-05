import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { Vector3 } from 'three';

import { section } from '@/navigation/structure';
import { ticker } from '@/runtime/ticker';
import { spatial } from '@/stage/spatial';

import { choreographer } from '../choreographer';

/** Labels belong to the engaged section; they hide when it disengages. */
const MIN_ACTIVATION = 0.05;
/** Margin beyond the viewport (NDC) before a label hides. */
const EDGE = 1.1;

/**
 * Projects spatial anchors into screen space after the frame renders — the
 * camera is final, so labels and 3D never disagree by a frame — and writes each
 * label's transform only when it changes.
 */
export function SpatialProjector() {
  const get = useThree((state) => state.get);

  useEffect(() => {
    const point = new Vector3();
    return ticker.add('late', () => {
      const { camera, size } = get();
      for (const label of spatial.labels) {
        const anchor = spatial.anchors.get(label.anchor);
        let visible = false;
        const index = anchor ? section(anchor.section).index : -1;
        const engaged =
          (choreographer.activation[index] ?? 0) > MIN_ACTIVATION &&
          (choreographer.reveal[index] ?? 0) > MIN_ACTIVATION;
        if (anchor && engaged) {
          anchor.read(point);
          point.project(camera);
          if (
            point.z > -1 &&
            point.z < 1 &&
            Math.abs(point.x) <= EDGE &&
            Math.abs(point.y) <= EDGE
          ) {
            visible = true;
            const x = Math.round((point.x * 0.5 + 0.5) * size.width * 2) / 2;
            const y = Math.round((0.5 - point.y * 0.5) * size.height * 2) / 2;
            if (x !== label.x || y !== label.y) {
              label.x = x;
              label.y = y;
              label.element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
            }
          }
        }
        if (visible !== label.visible) {
          label.visible = visible;
          label.element.dataset.visible = String(visible);
        }
      }
      return false;
    });
  }, [get]);

  return null;
}
