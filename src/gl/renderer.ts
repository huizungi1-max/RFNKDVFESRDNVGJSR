import {
  NeutralToneMapping,
  SRGBColorSpace,
  WebGLRenderer,
  type WebGLRendererParameters,
} from 'three';
import type { Dpr, RootState } from '@react-three/fiber';

/**
 * Canvas clear colour (sRGB). Mirrors `--color-bg` in src/styles/tokens.css so
 * the canvas is indistinguishable from the page behind it — keep them in sync.
 */
export const CLEAR_COLOR = '#0a0b0d';

/**
 * Device-pixel-ratio bounds. The ceiling caps fill-rate cost on high-density
 * displays, where rendering beyond 2× is rarely perceptible.
 */
export const DPR_RANGE: Dpr = [1, 2];

/** WebGL context attributes. Fixed for the lifetime of the context. */
const CONTEXT_ATTRIBUTES = {
  // three.js always allocates an alpha channel; `false` makes it clear with
  // alpha 1, so the canvas is opaque and the page never shows through.
  alpha: false,
  antialias: true,
  depth: true,
  // No stencil-based techniques are planned; omitting the buffer saves memory.
  stencil: false,
  powerPreference: 'high-performance',
  preserveDrawingBuffer: false,
} as const satisfies WebGLRendererParameters;

/** Renderer factory for the `gl` prop of `<Canvas>`. */
export function createRenderer(defaults: WebGLRendererParameters): WebGLRenderer {
  return new WebGLRenderer({ ...defaults, ...CONTEXT_ATTRIBUTES });
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
