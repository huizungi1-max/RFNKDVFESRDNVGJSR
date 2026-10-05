# Kaushal — Portfolio

Immersive 3D portfolio of Kaushal — Electronics and Communications Engineering (ECE), focused on digital hardware (FPGA/RTL) and embedded firmware.

## Stack

| Concern | Choice                                             |
| ------- | -------------------------------------------------- |
| Build   | Vite 8 (Rolldown + Oxc)                            |
| UI      | React 19, TypeScript 6 (strict), CSS Modules       |
| 3D      | three.js r186 on WebGL 2, via @react-three/fiber 9 |
| State   | Zustand 5                                          |
| Type    | IBM Plex Sans + IBM Plex Mono (self-hosted)        |
| Quality | Oxlint (incl. jsx-a11y, import cycles), Prettier   |

Dependencies are pinned to exact versions (`.npmrc`); upgrade them deliberately.

## Requirements

Node.js 24 LTS (`.nvmrc`; ≥ 22.12 supported) and npm.

## Commands

| Command            | Purpose                                          |
| ------------------ | ------------------------------------------------ |
| `npm run dev`      | Dev server at http://localhost:5173              |
| `npm run dev:host` | Dev server exposed on the LAN for device testing |
| `npm run build`    | Type-check, then production build to `dist/`     |
| `npm run preview`  | Serve the production build locally               |
| `npm run check`    | Type-check, lint, and verify formatting          |
| `npm run format`   | Format all files                                 |

Append `?debug` to any URL for diagnostics: a HUD (clock, device profile, stage health, navigation, choreography) and stand-in outlines for sections without scenes.

## Source layout

```
src/
├── main.tsx       Entry: fonts, design tokens, boot, React root
├── app/           Composition root, boot sequence, state → <html> attribute bridge
├── content/       Portfolio content only, typed — null until supplied, never invented
├── design/        Design tokens and motion language (TypeScript source → generated CSS)
├── environment/   Device profile: layout, input, reduced motion, render tier, quality table
├── navigation/    Single source of truth: sections, steps, transitions, URL sync
├── input/         Sole owner of wheel, touch, keyboard and pointer input → intents
├── motion/        Frame-rate-independent springs and curve maths
├── runtime/       The application clock: one phased frame loop that sleeps when idle
├── stage/         Main-chunk side of the stage: status, host, error boundary, spatial bridge
├── sections/      Section registry: world anchors, camera framing, lighting moods, scene loaders
├── gl/            Lazy WebGL chunk: canvas, world, choreographer, camera rig, lighting, director
├── ui/            Semantic interface: navigation, section panels, step controls, announcer
└── styles/        Global document styles
tooling/           Vite plugin that serves the design tokens as CSS
```

## Runtime architecture

- **One source of truth.** `navigation/store` holds where the visitor is going; every view — camera, scenes, interface, URL, announcements — derives from it. A new intent mid-transition replaces the destination, and the motion layer retargets from wherever it is.
- **One gesture, one transition.** `input/controller` turns wheel, trackpad momentum, touch and keys into intents. Linear navigation walks the six sections and the eight project stages inside Projects; ←/→ and horizontal swipes move within a section.
- **One clock.** `runtime/ticker` runs input → update → render → late each frame at the display's refresh rate, advances react-three-fiber manually, and stops when nothing moves.
- **Choreography.** Adjacent sections _travel_ (camera moves, scenes crossfade), distant ones _cut_ (fade, cut, arrive), steps _transform_ the environment. Reduced motion always cuts, with no travel or parallax.
- **One world.** A single persistent canvas and scene graph. Shared infrastructure (camera rig, lighting, spatial projection) lives in `gl/`; each section's content is a lazily loaded scene the director mounts at its anchor — residency by tier, compiled before reveal, failures isolated.
- **Semantic interface.** All readable content is DOM. Panels are always in the document, inert when inactive, and animate by phase with CSS transitions on spring-derived curves. Focus follows arrivals; arrivals are announced.
- **Graceful degradation.** Without WebGL, or after a failure, the stage steps aside and the interface carries the full experience.

## Conventions

- three.js and react-three-fiber are imported only in `src/gl/**` and `src/sections/*/scene/**` (enforced by lint), keeping them out of the first-paint chunk.
- Section scenes are default exports implementing `SceneProps`, registered in `sections/registry.ts`, animated through `useSectionFrame`.
- Frame callbacks never allocate and never set React state; per-frame data flows through refs and shared buffers.
- Modules loaded by the Vite config (`src/design`, `src/motion/curves.ts`) use relative imports with explicit `.ts` extensions.
- In `src/gl`, the React Compiler `immutability` rule is off: three.js objects are mutated imperatively by design.
