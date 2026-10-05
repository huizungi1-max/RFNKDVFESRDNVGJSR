---
inclusion: always
---

# Kaushal portfolio — standing rules

Immersive 3D engineering portfolio for **Kaushal**, Electronics and Communications Engineering (ECE). Focus: digital hardware / FPGA-RTL and embedded firmware. Built in sequential parts; each part arrives as a complete specification.

## Content integrity — non-negotiable

- Use only facts the user has supplied. Never invent projects, employment, internships, companies, awards, certifications, publications, metrics, completion claims, or technical claims.
- Never alter the stated professional identity. When information is missing, omit it — no placeholder copy. Content lives only in `src/content`, `null`/empty until supplied.

## Experience

- Major sections: Hero → Professional Identity → Projects (one environment containing all 8 project stages) → Technical Stack → Career Direction → Final / Contact.
- One intentional gesture produces exactly one transition: no scroll jail, double transitions, section skips, hidden snap points, or artificial input delays.
- The 3D is the experience, not decoration. Restraint over spectacle: light, motion, and effects appear only where they communicate something.
- Avoid template / "vibe-coded" patterns: decorative glows, meaningless particles, glass panels, fake stats, generic copy, animation on everything.

## Motion direction — critical

- Motion is LARGE, DRAMATIC, SMOOTH, SPACIOUS, CONTROLLED. When in doubt: make the movement bigger, the path cleaner, remove competing motion, give the camera more space.
- The camera is the primary instrument. Section transitions are physical journeys through the world (travel past structures, pull back to reveal, approach) — never a fade between sections. One large movement beats many small ones.
- Hierarchy, never inverted: 1 camera → 2 one major 3D transformation at a time → 3 subtle lighting/environment → 4 rare micro detail, never during camera movement. Scenes read `useSectionFrame`'s `camera` intensity and `arrived` to defer.
- Rhythm: still → one big movement → smooth settle → still. Settled compositions do not move; nothing idles in motion (no floating, pulsing, shimmering, constant shader movement, ambient parallax). Interface text fades, never travels.
- Fast + smooth, never fast + aggressive: no sudden starts or stops, snaps, sharp turns, linear or bouncy motion. Flights stay short enough never to trap the visitor and are always interruptible with momentum.
- Use the full depth of the space: foreground, middle ground, deep background, large separations, strong perspective changes.
- Camera smoothness outranks effect count: simplify effects before compromising frame pacing. Reduced motion keeps its own path (cuts behind a veil, no travel).

## Architecture (PART 1) — extend, don't bypass

- Navigation state (`src/navigation/store`) is the single source of truth; nothing decides position on its own.
- All input goes through `src/input/controller`; no component adds navigation listeners.
- The camera is owned by `gl/camera/CameraRig`: C²-continuous flights between sections (`gl/camera/flight`), rails within them. Sections describe framings and world placement in `sections/registry`; flight timing and arcs come from `sections/passage`.
- Motion uses `design/motion` tokens and `motion/spring`; DOM motion uses phases (`ui/phase`) and the generated CSS curves.
- Section scenes are lazy modules registered in `sections/registry`, animated via `useSectionFrame`; they never touch the clock, camera, or navigation directly.
- three.js only in `src/gl/**` and `src/sections/*/scene/**` (lint-enforced). Frame callbacks never allocate or set React state; dispose imperatively created GPU resources (`useDisposable`).
- Readable content is semantic DOM; the canvas stays `aria-hidden`. Reduced motion, keyboard, focus, touch targets and safe areas are baseline.
- Before committing: `npm run check` and `npm run build` pass with zero warnings.
