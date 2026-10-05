import { useEffect, useState } from 'react';

import { environmentStore } from '@/environment/store';
import { choreographer } from '@/gl/choreographer';
import { navigationStore } from '@/navigation/store';
import { SECTIONS } from '@/navigation/structure';
import { ticker } from '@/runtime/ticker';
import { stageStore } from '@/stage/store';

import { SpatialLabel } from '../SpatialLabel';
import { indexLabel } from '../labels';
import styles from './DebugHud.module.css';

/** Sampling interval (ms). Deliberately off the frame loop, so the HUD never keeps it awake. */
const SAMPLE_MS = 250;

function sample(): string {
  const { stats } = ticker;
  const environment = environmentStore.getState();
  const navigation = navigationStore.getState();
  const stage = stageStore.getState();
  const { current, transition } = navigation;
  const presence = SECTIONS.map(
    (s) => `${s.id}:${(choreographer.presence[s.index] ?? 0).toFixed(2)}`,
  );
  return [
    `display  ${(1000 / stats.intervalMs).toFixed(0)} Hz  work ${stats.workMs.toFixed(2)} ms  frames ${stats.frames}  ${stats.running ? 'running' : 'asleep'}`,
    `device   ${environment.viewport.width}×${environment.viewport.height} ${environment.viewport.layout} ${environment.pointer}  tier ${environment.tier}  motion ${environment.reducedMotion ? 'reduced' : 'full'}`,
    `stage    ${stage.status}${stage.reason ? ` (${stage.reason})` : ''}  gpu ${stage.gpu ?? '—'}`,
    `at       ${current.section}/${current.step + 1}  ${transition ? `${transition.choreography} ${transition.from.section}/${transition.from.step + 1} -> ${transition.to.section}/${transition.to.step + 1}` : 'settled'}`,
    `camera   focus ${SECTIONS[choreographer.focus]?.id ?? '—'}  step ${(choreographer.step[choreographer.focus] ?? 0).toFixed(2)}  cuts ${choreographer.cuts}`,
    `presence ${presence.join('  ')}`,
  ].join('\n');
}

/**
 * Developer diagnostics (`?debug=hud`): clock, device profile, stage health,
 * navigation and choreography state, and section anchors labelled in place.
 * Loaded only when requested.
 */
export default function DebugHud() {
  const [text, setText] = useState(sample);

  useEffect(() => {
    const interval = window.setInterval(() => setText(sample()), SAMPLE_MS);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className={styles.root} aria-hidden="true">
      <pre className={styles.hud}>{text}</pre>
      {SECTIONS.map((structure) => (
        <SpatialLabel key={structure.id} anchor={`debug:${structure.id}`} className={styles.anchor}>
          {indexLabel(structure)} · {structure.id}
        </SpatialLabel>
      ))}
    </div>
  );
}
