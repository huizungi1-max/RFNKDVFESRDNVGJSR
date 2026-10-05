import { PROJECT_STAGES } from '@/content/projects';
import type { SectionCopy, SectionId } from '@/content/schema';
import { SECTION_COPY } from '@/content/sections';

/** The navigable shape of the experience, derived from content. */
export interface SectionStructure {
  readonly id: SectionId;
  readonly index: number;
  readonly copy: SectionCopy;
  /** Views inside the section (Projects: one per stage); 1 for single-view sections. */
  readonly steps: number;
  /** Whether linear navigation (scroll, swipe, ↑/↓) walks through the steps. */
  readonly linearSteps: boolean;
  /** Stable identity of each step (keys, analytics); `steps` long. */
  readonly stepIds: readonly string[];
}

/** Sections with internal steps. Every other section is a single view. */
const STEPPED: Partial<Record<SectionId, { stepIds: readonly string[]; linearSteps: boolean }>> = {
  projects: { stepIds: PROJECT_STAGES.map((stage) => stage.id), linearSteps: true },
};

export const SECTIONS: readonly SectionStructure[] = SECTION_COPY.map((copy, index) => {
  const stepIds = STEPPED[copy.id]?.stepIds ?? [copy.id];
  return {
    id: copy.id,
    index,
    copy,
    steps: stepIds.length,
    linearSteps: STEPPED[copy.id]?.linearSteps ?? false,
    stepIds,
  };
});

export const SECTION_COUNT = SECTIONS.length;

const BY_ID = new Map(SECTIONS.map((structure) => [structure.id, structure]));

export function section(id: SectionId): SectionStructure {
  const structure = BY_ID.get(id);
  if (!structure) throw new Error(`Unknown section: ${id}`);
  return structure;
}

export function sectionAt(index: number): SectionStructure | undefined {
  return SECTIONS[index];
}

export function firstSection(): SectionStructure {
  return section(SECTION_COPY[0]?.id ?? 'hero');
}

export function lastSection(): SectionStructure {
  return section(SECTION_COPY[SECTION_COPY.length - 1]?.id ?? 'contact');
}
