import styles from './Icon.module.css';

/** Hairline arrows on a 16-unit grid; drawn, not typeset, so no font can drop them. */
const PATHS = {
  left: 'M13.5 8H3M7.25 3.75 3 8l4.25 4.25',
  right: 'M2.5 8H13M8.75 3.75 13 8l-4.25 4.25',
  down: 'M8 2.5V13M3.75 8.75 8 13l4.25-4.25',
} as const;

export type IconName = keyof typeof PATHS;

/** Decorative icon: always hidden from assistive technology — the control carries the label. */
export function Icon({ name }: { name: IconName }) {
  return (
    <svg className={styles.icon} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d={PATHS[name]} />
    </svg>
  );
}
