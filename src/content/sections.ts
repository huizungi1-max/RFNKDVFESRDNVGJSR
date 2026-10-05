import type { SectionCopy } from './schema';

/**
 * The six major sections, in journey order. Titles follow the information
 * architecture; "Introduction" is the visitor-facing label for the hero.
 */
export const SECTION_COPY: readonly SectionCopy[] = [
  { id: 'hero', title: 'Introduction', shortTitle: 'Intro' },
  { id: 'identity', title: 'Professional Identity', shortTitle: 'Identity' },
  { id: 'projects', title: 'Projects', shortTitle: 'Projects' },
  { id: 'stack', title: 'Technical Stack', shortTitle: 'Stack' },
  { id: 'career', title: 'Career Direction', shortTitle: 'Direction' },
  { id: 'contact', title: 'Contact', shortTitle: 'Contact' },
];
