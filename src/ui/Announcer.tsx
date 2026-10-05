import { useEffect, useState } from 'react';

import { navigationStore } from '@/navigation/store';

import { announcement } from './labels';

/** Short pause so rapid navigation announces only where the visitor lands. */
const SETTLE_MS = 250;

/** Politely announces arrivals to screen readers; silent on first load. */
export function Announcer() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    let timer = 0;
    const unsubscribe = navigationStore.subscribe((state, previous) => {
      const { current } = state;
      if (current.section === previous.current.section && current.step === previous.current.step) {
        return;
      }
      const sectionChanged = current.section !== previous.current.section;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setMessage(announcement(current, sectionChanged)), SETTLE_MS);
    });
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
    };
  }, []);

  return (
    // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- role="status" on a div is the most consistently announced live region across screen readers; <output> is not.
    <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
      {message}
    </div>
  );
}
