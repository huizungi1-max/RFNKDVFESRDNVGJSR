/**
 * Content schema. Content modules hold portfolio information only — no layout,
 * styling, or scene configuration — so content can change without touching the
 * engine.
 *
 * Integrity rule: every value must come from information supplied for this
 * portfolio. Where content has not been supplied, modules hold `null` or empty
 * collections; they are never filled with invented copy.
 */

export type SectionId = 'hero' | 'identity' | 'projects' | 'stack' | 'career' | 'contact';

export interface SiteIdentity {
  readonly name: string;
  readonly discipline: string;
  readonly disciplineShort: string;
  readonly focus: readonly string[];
}

/** Navigation and heading copy for a major section. */
export interface SectionCopy {
  readonly id: SectionId;
  /** Full title — navigation and the section's accessible name. */
  readonly title: string;
  /** Short title for compact layouts. */
  readonly shortTitle: string;
}

/** Explicit, supplied status — never inferred. */
export type ProjectStatus = 'complete' | 'in-progress' | 'planned';

export interface ProjectLink {
  readonly label: string;
  readonly href: string;
}

export interface ProjectContent {
  readonly title: string;
  readonly summary: string;
  /** Technical domain, e.g. the area of digital hardware or firmware. */
  readonly domain: string;
  readonly technologies: readonly string[];
  readonly status: ProjectStatus;
  readonly links?: readonly ProjectLink[];
}

/** One stage of the eight-stage project roadmap. */
export interface ProjectStage {
  /** Stable identifier (URLs, keys). */
  readonly id: string;
  /** `null` until the project's content is supplied. */
  readonly content: ProjectContent | null;
}

export interface SkillGroup {
  readonly label: string;
  readonly items: readonly string[];
}

export interface CareerDirection {
  readonly statement: string;
  readonly areas: readonly string[];
}

export type ContactKind = 'email' | 'linkedin' | 'github' | 'other';

export interface ContactChannel {
  readonly kind: ContactKind;
  readonly label: string;
  readonly href: string;
}
