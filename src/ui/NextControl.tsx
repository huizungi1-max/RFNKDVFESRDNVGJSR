import { navigationStore, useNavigation } from '@/navigation/store';

import { Icon } from './Icon';
import { nextLabel } from './labels';
import styles from './NextControl.module.css';

/** "Where can I go next?" — always answered, and one press away. */
export function NextControl() {
  const label = useNavigation(nextLabel);
  if (!label) return null;
  return (
    <button
      type="button"
      className={styles.next}
      aria-label={`Next: ${label}`}
      onClick={() => navigationStore.getState().advance(1, 'control')}
    >
      <span className={styles.arrow}>
        <Icon name="down" />
      </span>
      <span className={styles.kicker} aria-hidden="true">
        Next
      </span>
      <span className={styles.label} aria-hidden="true">
        {label}
      </span>
    </button>
  );
}
