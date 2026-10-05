# Kaushal — Portfolio

Immersive 3D portfolio of Kaushal — Electronics and Communications Engineering (ECE), focused on digital hardware (FPGA/RTL) and embedded firmware.

## Stack

| Concern | Choice                                             |
| ------- | -------------------------------------------------- |
| Build   | Vite 8 (Rolldown + Oxc)                            |
| UI      | React 19, TypeScript 6 (strict), CSS Modules       |
| 3D      | three.js r186 on WebGL 2, via @react-three/fiber 9 |
| State   | Zustand 5                                          |
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

## Source layout

```
src/
├── main.tsx    Entry: global styles and React root
├── app/        Composition root — the WebGL stage beneath the DOM interface
├── gl/         WebGL stage: canvas, renderer configuration, failure boundary
└── styles/     Design tokens and global base styles
```

## Runtime architecture

- **One persistent canvas.** The WebGL stage mounts once and is never re-created; scene content changes inside it.
- **Two layers.** All readable content lives in the semantic DOM interface. The canvas is presentational and `aria-hidden`.
- **Progressive loading.** three.js and react-three-fiber load as lazy chunks, so the document shell paints first. `react` and `three` are split into vendor chunks for long-term caching.
- **Graceful degradation.** `StageBoundary` contains WebGL failures (unsupported, context creation, chunk load) so the interface stays usable.
- **Colour pipeline.** sRGB output with Khronos PBR Neutral tone mapping; device pixel ratio clamped to [1, 2].
- **Frame-loop discipline.** Per-frame code must not allocate or trigger React renders.
