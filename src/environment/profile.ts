import { layout as layoutTokens } from '@/design/tokens';

/**
 * Device and viewport detection. Pure reads of the browser environment; the
 * environment store keeps the results current.
 */

export type LayoutClass = 'compact' | 'medium' | 'wide';
export type Orientation = 'portrait' | 'landscape';
export type PointerKind = 'fine' | 'coarse';
export type MotionPreference = 'system' | 'reduce' | 'full';
export type RenderTier = 'high' | 'balanced' | 'low';

export interface Viewport {
  readonly width: number;
  readonly height: number;
  readonly layout: LayoutClass;
  readonly orientation: Orientation;
}

export const MEDIA = {
  reducedMotion: '(prefers-reduced-motion: reduce)',
  coarsePointer: '(pointer: coarse)',
  hover: '(hover: hover)',
} as const;

interface NavigatorHints {
  readonly deviceMemory?: number;
  readonly connection?: { readonly saveData?: boolean };
}

export function classifyLayout(width: number, height: number): LayoutClass {
  if (Math.min(width, height) < layoutTokens.compactMaxShortSide) return 'compact';
  return width < layoutTokens.wideMinWidth ? 'medium' : 'wide';
}

export function readViewport(): Viewport {
  const width = window.innerWidth;
  const height = window.innerHeight;
  return {
    width,
    height,
    layout: classifyLayout(width, height),
    orientation: width >= height ? 'landscape' : 'portrait',
  };
}

export function matchesMedia(query: string): boolean {
  return window.matchMedia(query).matches;
}

export function readSaveData(): boolean {
  return (navigator as Navigator & NavigatorHints).connection?.saveData === true;
}

/** Whether the WebGL 2 API exists. Context creation can still fail; the stage handles that. */
export function hasWebGL2(): boolean {
  return typeof WebGL2RenderingContext !== 'undefined';
}

/**
 * First estimate of rendering capability, made before any GPU context exists.
 * The stage refines it once the context reports its renderer.
 */
export function estimateTier(pointer: PointerKind): RenderTier {
  const memory = (navigator as Navigator & NavigatorHints).deviceMemory;
  const cores = navigator.hardwareConcurrency;
  if ((memory !== undefined && memory <= 2) || cores <= 2) return 'low';
  if (pointer === 'coarse' || (memory !== undefined && memory <= 4) || cores <= 4) {
    return 'balanced';
  }
  return 'high';
}

const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software|basic render/i;

/** Software rasterisers have no GPU acceleration. */
export function isSoftwareRenderer(name: string): boolean {
  return SOFTWARE_RENDERER.test(name);
}

/** Developer diagnostics, e.g. `?debug` or `?debug=stage,hud`. */
export function readDebugFlags(): ReadonlySet<string> {
  const value = new URLSearchParams(window.location.search).get('debug');
  if (value === null) return new Set();
  if (value === '') return new Set(['stage', 'hud']);
  return new Set(
    value
      .split(',')
      .map((flag) => flag.trim())
      .filter(Boolean),
  );
}
