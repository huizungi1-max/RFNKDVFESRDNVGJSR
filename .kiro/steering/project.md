---
inclusion: always
---

# Kaushal portfolio — standing rules

Immersive 3D engineering portfolio for **Kaushal**, Electronics and Communications Engineering (ECE). Focus: digital hardware / FPGA-RTL and embedded firmware. Built in sequential parts; each part arrives as a complete specification.

## Content integrity — non-negotiable

- Use only facts the user has supplied. Never invent projects, employment, internships, companies, awards, certifications, publications, metrics, completion claims, or technical claims.
- Never alter the stated professional identity. When information is missing, omit it — no placeholder copy.

## Experience

- Major sections: Hero → Professional Identity → Projects (one environment containing all 8 project stages) → Technical Stack → Career Direction → Final / Contact.
- One intentional gesture produces exactly one transition: no scroll jail, double transitions, section skips, hidden snap points, or artificial input delays.
- The 3D is the experience, not decoration. Restraint over spectacle: light, motion, and effects appear only where they communicate something.
- Avoid template / "vibe-coded" patterns: decorative glows, meaningless particles, glass panels, fake stats, generic copy, animation on everything.

## Engineering

- Stack and layout: see README.md. Add dependencies only with a clear need; versions are pinned exactly.
- One persistent canvas; readable content lives in semantic DOM; the canvas stays `aria-hidden`.
- Motion is frame-rate independent and interruptible. No allocations or React state updates inside frame callbacks; dispose GPU resources created outside the declarative tree.
- Accessibility is baseline: keyboard navigation, visible focus, `prefers-reduced-motion`, adequate touch targets, safe areas.
- Before committing: `npm run check` and `npm run build` pass with zero warnings.
