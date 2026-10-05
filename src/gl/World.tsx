import { useEffect } from 'react';

import { color } from '@/design/tokens';
import { ticker } from '@/runtime/ticker';

import { CameraRig } from './camera/CameraRig';
import { choreographer } from './choreographer';
import { SceneDirector } from './director/SceneDirector';
import { Lighting } from './lighting/Lighting';
import { SpatialProjector } from './spatial/SpatialProjector';

/**
 * The shared world: one scene graph for the whole experience. The world owns the
 * infrastructure every section shares — background, camera, lighting, motion,
 * spatial UI — while the director mounts each section's content at its anchor.
 */
export function World() {
  useEffect(() => {
    choreographer.reset();
    return ticker.add('update', (tick) => choreographer.update(tick));
  }, []);

  return (
    <>
      <color attach="background" args={[color.bg]} />
      <CameraRig />
      <Lighting />
      <SceneDirector />
      <SpatialProjector />
    </>
  );
}
