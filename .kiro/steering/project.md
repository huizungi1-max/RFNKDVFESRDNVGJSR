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

## Architecture (PART 1) — extend, don't bypass

- Navigation state (`src/navigation/store`) is the single source of truth; nothing decides position on its own.
- All input goes through `src/input/controller`; no component adds navigation listeners.
- The camera is owned by `gl/camera/CameraRig`; sections describe framings in `sections/registry`.
- Motion uses `design/motion` tokens and `motion/spring`; DOM motion uses phases (`ui/phase`) and the generated CSS curves.
- Section scenes are lazy modules registered in `sections/registry`, animated via `useSectionFrame`; they never touch the clock, camera, or navigation directly.
- three.js only in `src/gl/**` and `src/sections/*/scene/**` (lint-enforced). Frame callbacks never allocate or set React state; dispose imperatively created GPU resources (`useDisposable`).
- Readable content is semantic DOM; the canvas stays `aria-hidden`. Reduced motion, keyboard, focus, touch targets and safe areas are baseline.
- Before committing: `npm run check` and `npm run build` pass with zero warnings.
