import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import type { DirectionalLight, HemisphereLight } from 'three';

import { color } from '@/design/tokens';
import { SECTION_DEFINITIONS } from '@/sections/registry';
import type { LightingMood } from '@/sections/types';

import { choreographer } from '../choreographer';

const DEFAULT_MOOD: LightingMood = { exposure: 1, key: 1.6, ambient: 0.35 };
const LIGHTING_FRAME_PRIORITY = -90;

/**
 * The shared lighting rig. The world owns its lights; sections contribute a mood
 * (exposure, key, ambient), blended by presence, so lighting changes with the
 * same continuity as everything else. Sections may add local accent lights inside
 * their own scenes, but never replace these.
 */
export function Lighting() {
  const gl = useThree((state) => state.gl);
  const key = useRef<DirectionalLight>(null);
  const ambient = useRef<HemisphereLight>(null);

  useFrame(() => {
    let weight = 0;
    let exposure = 0;
    let keyIntensity = 0;
    let ambientIntensity = 0;
    for (let i = 0; i < SECTION_DEFINITIONS.length; i++) {
      const presence = choreographer.presence[i] ?? 0;
      const mood = SECTION_DEFINITIONS[i]?.stage.mood;
      if (presence <= 0 || !mood) continue;
      weight += presence;
      exposure += presence * mood.exposure;
      keyIntensity += presence * mood.key;
      ambientIntensity += presence * mood.ambient;
    }
    const scale = weight > 1e-3 ? 1 / weight : 0;
    gl.toneMappingExposure = scale ? exposure * scale : DEFAULT_MOOD.exposure;
    if (key.current) key.current.intensity = scale ? keyIntensity * scale : DEFAULT_MOOD.key;
    if (ambient.current) {
      ambient.current.intensity = scale ? ambientIntensity * scale : DEFAULT_MOOD.ambient;
    }
  }, LIGHTING_FRAME_PRIORITY);

  return (
    <>
      <hemisphereLight ref={ambient} args={[color.fg, color.bg, DEFAULT_MOOD.ambient]} />
      <directionalLight ref={key} position={[6, 10, 8]} intensity={DEFAULT_MOOD.key} />
    </>
  );
}
