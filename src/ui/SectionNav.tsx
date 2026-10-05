import { useNavigation } from '@/navigation/store';
import { SECTIONS } from '@/navigation/structure';
import { hrefFor } from '@/navigation/url';

import { indexLabel } from './labels';
import { selectSection } from './navigate';
import styles from './SectionNav.module.css';

/** Persistent wayfinding: every major section, the current one marked. */
export function SectionNav() {
  const current = useNavigation((state) => state.current.section);
  return (
    <nav className={styles.nav} aria-label="Sections">
      <ol className={styles.list}>
        {SECTIONS.map((structure) => (
          <li key={structure.id}>
            <a
              className={styles.link}
              href={hrefFor({ section: structure.id, step: 0 })}
              aria-current={structure.id === current ? 'location' : undefined}
              onClick={(event) => selectSection(event, structure.id)}
            >
              <span className={styles.index} aria-hidden="true">
                {indexLabel(structure)}
              </span>
              <span className={styles.label}>{structure.copy.title}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
