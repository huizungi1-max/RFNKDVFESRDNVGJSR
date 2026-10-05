import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import type { DirectionalLight, HemisphereLight } from 'three';

import { color } from '@/design/tokens';
import { SECTION_DEFINITIONS } from '@/sections/registry';
import type { LightingMood } from '@/sections/types';

import { choreographer } from '../choreographer';

const NEUTRAL: LightingMood = { exposure: 1, key: 1.6, ambient: 0.35 };
const LIGHTING_FRAME_PRIORITY = -90;

/**
 * The shared lighting rig — motion hierarchy level 3: subtle support. The world
 * owns its lights; sections contribute a mood (exposure, key, ambient) weighted by
 * activation, with the neutral mood filling any remaining weight, so lighting
 * shifts continuously and never jumps mid-flight. Sections may add local accent
 * lights inside their own scenes, but never replace these.
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
      const activation = choreographer.activation[i] ?? 0;
      const mood = SECTION_DEFINITIONS[i]?.stage.mood;
      if (activation <= 0 || !mood) continue;
      weight += activation;
      exposure += activation * mood.exposure;
      keyIntensity += activation * mood.key;
      ambientIntensity += activation * mood.ambient;
    }
    const neutral = Math.max(0, 1 - weight);
    const total = weight + neutral;
    gl.toneMappingExposure = (exposure + neutral * NEUTRAL.exposure) / total;
    if (key.current) key.current.intensity = (keyIntensity + neutral * NEUTRAL.key) / total;
    if (ambient.current) {
      ambient.current.intensity = (ambientIntensity + neutral * NEUTRAL.ambient) / total;
    }
  }, LIGHTING_FRAME_PRIORITY);

  return (
    <>
      <hemisphereLight ref={ambient} args={[color.fg, color.bg, NEUTRAL.ambient]} />
      <directionalLight ref={key} position={[6, 10, 8]} intensity={NEUTRAL.key} />
    </>
  );
}
