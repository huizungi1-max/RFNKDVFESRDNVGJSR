import type { MouseEvent } from 'react';

import { SITE } from '@/content/site';
import { useNavigation } from '@/navigation/store';
import { SECTIONS, firstSection } from '@/navigation/structure';
import { hrefFor } from '@/navigation/url';

import { Announcer } from './Announcer';
import { focusSectionHeading, useFocusHandoff } from './focus';
import styles from './Interface.module.css';
import { selectSection } from './navigate';
import { NextControl } from './NextControl';
import { SectionNav } from './SectionNav';
import { SectionPanel } from './SectionPanel';

/**
 * The document layer above the stage: identity, wayfinding, and every section's
 * content. It is fully functional on its own — before the stage loads, and when
 * WebGL is unavailable.
 */
export function Interface() {
  useFocusHandoff();
  const current = useNavigation((state) => state.current.section);
  const home = firstSection().id;

  const skipToContent = (event: MouseEvent) => {
    event.preventDefault();
    focusSectionHeading(current);
  };

  return (
    <div className={styles.interface}>
      <a className={styles.skip} href="#main-content" onClick={skipToContent}>
        Skip to content
      </a>
      <header className={styles.header}>
        <a
          className={styles.wordmark}
          href={hrefFor({ section: home, step: 0 })}
          onClick={(event) => selectSection(event, home)}
        >
          {SITE.name}
        </a>
        <SectionNav />
      </header>
      <main id="main-content" className={styles.main}>
        <h1 className="visually-hidden">
          {SITE.name} — {SITE.discipline}
        </h1>
        {SECTIONS.map((structure) => (
          <SectionPanel key={structure.id} structure={structure} />
        ))}
      </main>
      <footer className={styles.footer}>
        <NextControl />
      </footer>
      <Announcer />
    </div>
  );
}
