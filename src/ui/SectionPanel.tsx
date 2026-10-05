import { useShallow } from 'zustand/react/shallow';

import { useNavigation } from '@/navigation/store';
import type { SectionStructure } from '@/navigation/structure';

import { indexLabel, stepName } from './labels';
import { stepPhase, useSectionPhase } from './phase';
import phase from './phase.module.css';
import styles from './SectionPanel.module.css';
import { StepControls } from './StepControls';

/** Element id of a section's heading. */
const headingId = (structure: SectionStructure) => `section-heading-${structure.id}`;

/** The current step's name, crossfading between steps. */
function StepTitles({ structure }: { structure: SectionStructure }) {
  const phases = useNavigation(
    useShallow((state) => structure.stepIds.map((_, step) => stepPhase(state, structure.id, step))),
  );
  return (
    <div className={styles.stepTitles}>
      {structure.stepIds.map((stepId, step) => {
        const stepState = phases[step] ?? 'inactive';
        const shown = stepState === 'active' || stepState === 'entering';
        return (
          <p
            key={stepId}
            className={`${phase.phased} ${styles.stepTitle}`}
            data-phase={stepState}
            aria-hidden={shown ? undefined : true}
          >
            {stepName(structure, step)}
          </p>
        );
      })}
    </div>
  );
}

/**
 * The interface for one major section. Every section is always in the document —
 * its heading and content are what assistive technology reads — while its phase
 * decides visibility; inactive sections are inert. Section content (later parts)
 * renders inside, never in the 3D canvas.
 */
export function SectionPanel({ structure }: { structure: SectionStructure }) {
  const sectionPhase = useSectionPhase(structure.id);
  const present = sectionPhase === 'active' || sectionPhase === 'entering';
  return (
    <section
      className={styles.panel}
      id={`section-${structure.id}`}
      aria-labelledby={headingId(structure)}
      data-phase={sectionPhase}
      inert={!present}
    >
      <div className={`${phase.phased} ${styles.content}`} data-phase={sectionPhase}>
        <p className={styles.index} aria-hidden="true">
          {indexLabel(structure)}
        </p>
        <h2
          className={styles.title}
          id={headingId(structure)}
          tabIndex={-1}
          data-section-heading={structure.id}
        >
          {structure.copy.title}
        </h2>
        {structure.steps > 1 && (
          <>
            <StepTitles structure={structure} />
            <StepControls structure={structure} />
          </>
        )}
      </div>
    </section>
  );
}
