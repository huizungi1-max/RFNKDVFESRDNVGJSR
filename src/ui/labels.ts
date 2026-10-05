import { PROJECT_STAGES } from '@/content/projects';
import { linearTarget, type Stop } from '@/navigation/model';
import type { NavigationState } from '@/navigation/store';
import { SECTION_COUNT, section, type SectionStructure } from '@/navigation/structure';

/** Interface wording derived from navigation structure and content. */

export const pad2 = (value: number) => String(value).padStart(2, '0');

/** "01" … "06". */
export const indexLabel = (structure: SectionStructure) => pad2(structure.index + 1);

/** The noun for a section's steps: the eight project stages, or generic steps. */
export const stepNoun = (structure: SectionStructure) =>
  structure.id === 'projects' ? 'Stage' : 'Step';

/** Accessible name for a section's step navigation. */
export const stepsLabel = (structure: SectionStructure) =>
  structure.id === 'projects' ? 'Project stages' : `${structure.copy.title} steps`;

/** "Stage 03", with the project's title once its content is supplied. */
export function stepName(structure: SectionStructure, step: number): string {
  const name = `${stepNoun(structure)} ${pad2(step + 1)}`;
  const title = structure.id === 'projects' ? PROJECT_STAGES[step]?.content?.title : undefined;
  return title ? `${name}: ${title}` : name;
}

/** Where the next linear step leads, for the "next" affordance. */
export function nextLabel(state: NavigationState): string | null {
  const next = linearTarget(state.current, state.remembered, 1);
  if (!next) return null;
  const structure = section(next.section);
  return next.section === state.current.section
    ? stepName(structure, next.step)
    : structure.copy.title;
}

/** Screen-reader announcement for arriving at a stop. */
export function announcement(stop: Stop, sectionChanged: boolean): string {
  const structure = section(stop.section);
  const stepPart =
    structure.steps > 1
      ? `${stepName(structure, stop.step)}, ${stop.step + 1} of ${structure.steps}.`
      : '';
  if (!sectionChanged) return stepPart;
  const sectionPart = `${structure.copy.title}, section ${structure.index + 1} of ${SECTION_COUNT}.`;
  return stepPart ? `${sectionPart} ${stepPart}` : sectionPart;
}
