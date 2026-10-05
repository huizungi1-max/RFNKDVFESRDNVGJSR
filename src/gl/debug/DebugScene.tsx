import { useMemo, useRef } from 'react';
import {
  BoxGeometry,
  EdgesGeometry,
  LineBasicMaterial,
  Matrix4,
  Quaternion,
  Vector3,
  type Group,
  type LineSegments,
} from 'three';

import { color } from '@/design/tokens';
import { section } from '@/navigation/structure';
import { SECTION_DEFINITIONS, createShotFrame } from '@/sections/registry';
import type { SceneProps, SectionDefinition } from '@/sections/types';

interface Station {
  readonly position: [number, number, number];
  /** Faces the camera that frames this station. */
  readonly quaternion: Quaternion;
}

const ORIGIN = new Vector3();
const UP = new Vector3(0, 1, 0);

function stationsFor(definition: SectionDefinition, steps: number): readonly Station[] {
  const frame = createShotFrame();
  const facing = new Vector3();
  const orientation = new Matrix4();
  return Array.from({ length: steps }, (_, step) => {
    definition.stage.frame(step, 'wide', frame);
    const [tx, ty, tz] = frame.target;
    facing.set(frame.position[0] - tx, frame.position[1] - ty, frame.position[2] - tz);
    // Upright, facing the camera that frames the station.
    orientation.lookAt(facing, ORIGIN, UP);
    return {
      position: [tx, ty, tz],
      quaternion: new Quaternion().setFromRotationMatrix(orientation),
    };
  });
}

import { useDisposable, useSectionFrame, useSpatialAnchor } from '../hooks';

/**
 * Diagnostic stand-in for sections without a scene yet (`?debug=stage` only;
 * never part of the production experience). Outlines each station the camera
 * frames, so the world's scale and the camera's flights are visible, and
 * exercises the scene contract: lazy loading, compile-before-reveal, activation,
 * step position, spatial anchors and disposal.
 */
export default function DebugScene({ section: id }: SceneProps) {
  const structure = section(id);
  const definition = SECTION_DEFINITIONS[structure.index];
  const stations = useMemo(
    () => (definition ? stationsFor(definition, structure.steps) : []),
    [definition, structure.steps],
  );

  const outline = useDisposable(() => {
    const box = new BoxGeometry(9, 5, 0.0001);
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

  useSectionFrame(id, ({ activation, reveal, step }) => {
    idleLine.opacity = reveal;
    currentLine.opacity = reveal;
    const nearest = activation > 0.5 ? Math.round(step) : -1;
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
          position={stations[i]?.position}
          quaternion={stations[i]?.quaternion}
        />
      ))}
    </group>
  );
}
