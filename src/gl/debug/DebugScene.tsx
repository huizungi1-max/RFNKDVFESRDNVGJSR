import { useMemo, useRef } from 'react';
import {
  BoxGeometry,
  EdgesGeometry,
  LineBasicMaterial,
  type Group,
  type LineSegments,
} from 'three';

import { color } from '@/design/tokens';
import { section } from '@/navigation/structure';
import { SECTION_DEFINITIONS, stationsOf } from '@/sections/registry';
import type { SceneProps } from '@/sections/types';

import { useDisposable, useSectionFrame, useSpatialAnchor } from '../hooks';

/**
 * Diagnostic stand-in for sections without a scene yet (`?debug=stage` only;
 * never part of the production experience). Outlines each station the camera
 * frames and exercises the scene contract: lazy loading, compile-before-reveal,
 * presence, step position, spatial anchors and disposal.
 */
export default function DebugScene({ section: id }: SceneProps) {
  const structure = section(id);
  const definition = SECTION_DEFINITIONS[structure.index];
  const stations = useMemo(
    () => (definition ? stationsOf(definition, structure.steps) : []),
    [definition, structure.steps],
  );

  const outline = useDisposable(() => {
    const box = new BoxGeometry(4.8, 2.7, 0.0001);
    const edges = new EdgesGeometry(box);
    box.dispose();
    return edges;
  }, []);
  const idleLine = useDisposable(
    () => new LineBasicMaterial({ color: color.lineStrong, transparent: true, opacity: 0 }),
    [],
  );
  const currentLine = useDisposable(
    () => new LineBasicMaterial({ color: color.signal, transparent: true, opacity: 0 }),
    [],
  );

  const root = useRef<Group>(null);
  const lines = useRef<(LineSegments | null)[]>([]);
  useSpatialAnchor(`debug:${id}`, id, root);

  useSectionFrame(id, ({ presence, step }) => {
    idleLine.opacity = presence * 0.8;
    currentLine.opacity = presence;
    const nearest = Math.round(step);
    lines.current.forEach((line, i) => {
      if (line) line.material = i === nearest ? currentLine : idleLine;
    });
  });

  return (
    <group ref={root}>
      {structure.stepIds.map((stepId, i) => (
        <lineSegments
          key={stepId}
          ref={(line) => {
            lines.current[i] = line;
          }}
          geometry={outline}
          material={idleLine}
          position={stations[i]}
        />
      ))}
    </group>
  );
}
