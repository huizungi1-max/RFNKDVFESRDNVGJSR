/**
 * Serialises the design tokens into CSS custom properties. Called at build time
 * by tooling/design-tokens.ts; the result is served as `virtual:design-tokens.css`.
 *
 * Loaded by the Vite config, so this module and its imports use relative paths
 * with explicit `.ts` extensions (no `@/` alias) — valid for Node as well as Vite.
 */

import { cssSpringEasing } from '../motion/curves.ts';
import { dom, micro, reducedDom, type DomTiming } from './motion.ts';
import {
  color,
  fluidRange,
  font,
  layer,
  layout,
  leading,
  radius,
  space,
  stroke,
  text,
  tracking,
  weight,
} from './tokens.ts';

type Declarations = Record<string, string | number>;

const kebab = (name: string) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

function block(selector: string, declarations: Declarations): string {
  const body = Object.entries(declarations)
    .map(([name, value]) => `  --${name}: ${value};`)
    .join('\n');
  return `${selector} {\n${body}\n}`;
}

function prefixed(prefix: string, values: Record<string, string | number>): Declarations {
  return Object.fromEntries(
    Object.entries(values).map(([name, value]) => [`${prefix}-${kebab(name)}`, value]),
  );
}

/** clamp(min, fluid, max) between the fluid viewport range. */
function fluid([min, max]: readonly [number, number]): string {
  const [from, to] = fluidRange;
  const slope = ((max - min) * 16) / (to - from);
  const intercept = min - (from * slope) / 16;
  return `clamp(${min}rem, ${intercept.toFixed(4)}rem + ${(slope * 100).toFixed(4)}vw, ${max}rem)`;
}

/** Interface timing per choreography; `enter-at` scales the live transition duration. */
function timing(set: Readonly<Record<string, DomTiming>>): Declarations {
  const out: Declarations = {};
  for (const [name, t] of Object.entries(set)) {
    out[`motion-${name}-exit`] = `${t.exit}ms`;
    out[`motion-${name}-enter`] = `${t.enter}ms`;
    out[`motion-${name}-enter-at`] = t.enterAt;
  }
  return out;
}

export function designTokensCss(): string {
  const root: Declarations = {
    ...prefixed('color', color),
    ...prefixed('font', font),
    ...prefixed('weight', weight),
    ...Object.fromEntries(
      Object.entries(text).map(([name, range]) => [`text-${name}`, fluid(range)]),
    ),
    ...prefixed('leading', leading),
    ...prefixed('tracking', tracking),
    ...prefixed('space', space),
    ...prefixed('radius', radius),
    ...prefixed('stroke', stroke),
    ...prefixed('layer', layer),
    gutter: layout.gutter.wide,
    'touch-target': layout.touchTarget,
    ...timing(dom),
    'motion-hover': `${micro.hover}ms`,
    'motion-reveal': `${micro.reveal}ms`,
    // cubic-bezier approximations; replaced by exact spring curves where linear() is supported.
    'ease-settle': 'cubic-bezier(0.2, 0.75, 0.15, 1)',
    'ease-build': 'cubic-bezier(0.7, 0, 0.85, 0.3)',
    'ease-standard': 'cubic-bezier(0.25, 0.1, 0.1, 1)',
  };

  return [
    '/* Generated from src/design — do not edit. */',
    block(':root', root),
    `@supports (transition-timing-function: linear(0, 1)) {\n${block(':root', {
      'ease-settle': cssSpringEasing(1, 'out'),
      'ease-build': cssSpringEasing(1, 'in'),
      'ease-standard': cssSpringEasing(2, 'out'),
    })}\n}`,
    block(":root[data-layout='compact']", { gutter: layout.gutter.compact }),
    block(":root[data-layout='medium']", { gutter: layout.gutter.medium }),
    block(":root[data-motion='reduced']", {
      ...timing(reducedDom),
      'motion-reveal': '200ms',
    }),
  ].join('\n\n');
}
