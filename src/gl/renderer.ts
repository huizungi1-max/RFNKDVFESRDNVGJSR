import type { RootState } from '@react-three/fiber';
import {
  NeutralToneMapping,
  SRGBColorSpace,
  WebGLRenderer,
  type WebGLRendererParameters,
} from 'three';

import { isSoftwareRenderer } from '@/environment/profile';
import { QUALITY } from '@/environment/quality';
import { environmentStore } from '@/environment/store';
import { stageStore } from '@/stage/store';

/** WebGL context attributes. Fixed for the lifetime of the context. */
const CONTEXT_ATTRIBUTES = {
  // three.js always allocates an alpha channel; `false` makes it clear with
  // alpha 1, so the canvas is opaque and the page never shows through.
  alpha: false,
  depth: true,
  // No stencil-based techniques are planned; omitting the buffer saves memory.
  stencil: false,
  powerPreference: 'high-performance',
  preserveDrawingBuffer: false,
} as const satisfies WebGLRendererParameters;

/** The GPU's renderer string, avoiding the debug extension where it isn't needed. */
function rendererName(context: WebGLRenderingContext | WebGL2RenderingContext): string {
  const reported: unknown = context.getParameter(context.RENDERER);
  if (typeof reported === 'string' && !/^webkit webgl$/i.test(reported)) return reported;
  const info = context.getExtension('WEBGL_debug_renderer_info');
  const unmasked: unknown = info ? context.getParameter(info.UNMASKED_RENDERER_WEBGL) : null;
  return typeof unmasked === 'string' ? unmasked : 'unknown';
}

/** Renderer factory for the `gl` prop of `<Canvas>`. */
export function createRenderer(defaults: WebGLRendererParameters): WebGLRenderer {
  const { antialias } = QUALITY[environmentStore.getState().tier];
  const renderer = new WebGLRenderer({ ...defaults, ...CONTEXT_ATTRIBUTES, antialias });
  const gpu = rendererName(renderer.getContext());
  stageStore.getState().setGpu(gpu);
  // No GPU acceleration: keep the experience, at the lightest settings.
  if (isSoftwareRenderer(gpu)) environmentStore.getState().capTier('low');
  return renderer;
}

/**
 * Colour pipeline. Applied from `onCreated`, after react-three-fiber has written
 * its own tone-mapping default. Khronos PBR Neutral keeps material base colours
 * faithful — the most predictable baseline ahead of look development.
 */
export function configureRenderer({ gl }: RootState): void {
  gl.outputColorSpace = SRGBColorSpace;
  gl.toneMapping = NeutralToneMapping;
  gl.toneMappingExposure = 1;
}
