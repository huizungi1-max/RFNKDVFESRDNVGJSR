import { navigationStore, useNavigation } from '@/navigation/store';
import type { SectionStructure } from '@/navigation/structure';

import { Icon } from './Icon';
import { pad2, stepName, stepNoun, stepsLabel } from './labels';
import styles from './StepControls.module.css';

/**
 * Navigation inside a stepped section (the eight project stages): previous,
 * next, direct selection, and position. Steps transform the shared environment;
 * they are never separate pages.
 */
export function StepControls({ structure }: { structure: SectionStructure }) {
  const step = useNavigation((state) =>
    state.current.section === structure.id
      ? state.current.step
      : (state.remembered[structure.index] ?? 0),
  );
  const noun = stepNoun(structure).toLowerCase();
  const go = (target: number) =>
    navigationStore.getState().goTo(structure.id, { step: target, cause: 'control' });

  return (
    <nav className={styles.controls} aria-label={stepsLabel(structure)}>
      <button
        type="button"
        className={styles.arrow}
        onClick={() => go(step - 1)}
        disabled={step === 0}
        aria-label={`Previous ${noun}`}
      >
        <Icon name="left" />
      </button>
      <ol className={styles.steps}>
        {Array.from({ length: structure.steps }, (_, index) => (
          <li key={index}>
            <button
              type="button"
              className={styles.step}
              aria-current={index === step ? 'step' : undefined}
              aria-label={stepName(structure, index)}
              onClick={() => go(index)}
            >
              <span aria-hidden="true">{pad2(index + 1)}</span>
            </button>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className={styles.arrow}
        onClick={() => go(step + 1)}
        disabled={step === structure.steps - 1}
        aria-label={`Next ${noun}`}
      >
        <Icon name="right" />
      </button>
    </nav>
  );
}
