import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { BufferGeometry, Color, Float32BufferAttribute, ShaderMaterial, type Mesh } from 'three';

import { color } from '@/design/tokens';

import { choreographer } from './choreographer';
import { useDisposable } from './hooks';

/** Drawn last via render order; its frame callback only copies the veil value. */
const VEIL_RENDER_ORDER = 1_000_000;

const VERTEX = /* glsl */ `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
uniform vec3 tint;
uniform float opacity;
void main() {
  gl_FragColor = vec4(tint, opacity);
  #include <colorspace_fragment>
}
`;

/**
 * Reduced motion's only transition: a brief dip to the page background, behind
 * which the camera relocates instead of travelling. One full-screen triangle,
 * drawn only while the veil is not fully open.
 */
export function Veil() {
  const mesh = useRef<Mesh>(null);
  const geometry = useDisposable(() => {
    const triangle = new BufferGeometry();
    triangle.setAttribute(
      'position',
      new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3),
    );
    return triangle;
  }, []);
  const material = useDisposable(
    () =>
      new ShaderMaterial({
        uniforms: { tint: { value: new Color(color.bg) }, opacity: { value: 0 } },
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      }),
    [],
  );

  useFrame(() => {
    const target = mesh.current;
    const uniform = material.uniforms.opacity;
    if (!target || !uniform) return;
    uniform.value = choreographer.veil;
    target.visible = choreographer.veil > 0.001;
  });

  return (
    <mesh
      ref={mesh}
      geometry={geometry}
      material={material}
      frustumCulled={false}
      renderOrder={VEIL_RENDER_ORDER}
      visible={false}
    />
  );
}
