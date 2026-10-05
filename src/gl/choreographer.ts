import {
  reducedSprings,
  springs,
  transitions,
  type SpringName,
  type SpringToken,
} from '@/design/motion';
import { environmentStore } from '@/environment/store';
import { Spring } from '@/motion/spring';
import type { Transition } from '@/navigation/model';
import { navigationStore, type NavigationState } from '@/navigation/store';
import { SECTIONS, SECTION_COUNT, section } from '@/navigation/structure';
import type { Tick } from '@/runtime/ticker';

/** Visible presence below which a section counts as gone — the camera may cut. */
const GONE = 0.02;
/** A section this present is mid-transition: re-entering it starts immediately. */
const PARTLY_PRESENT = 0.3;

type Tokens = Readonly<Record<SpringName, SpringToken>>;

interface Track {
  /** Choreographed presence. */
  readonly presence: Spring;
  /** Load reveal: rises once the section's scene is compiled and ready. */
  readonly reveal: Spring;
  /** Continuous step position. */
  readonly step: Spring;
}

const read = (values: Float32Array, index: number) => values[index] ?? 0;

/**
 * Turns discrete navigation into continuous stage motion: how present each
 * section is, where each section is along its steps, and which section the
 * camera frames. The only writer of these values; scenes, lighting and the
 * camera read them.
 *
 * Choreographies (see design/motion):
 *  - travel: the camera heads for the new section at once; the outgoing scene
 *    recedes, the incoming one rises after a beat.
 *  - cut: outgoing scenes fade; once gone, the camera cuts and the new scene
 *    arrives. Distant jumps and reduced motion use this.
 *  - step: the section's step position moves; the environment transforms.
 *
 * A new transition mid-flight retargets every spring from its current state, so
 * interrupted motion stays continuous and the stage is never in an invalid state.
 */
export class Choreographer {
  /** Visible presence of each section, 0–1 (choreography × load reveal). */
  readonly presence = new Float32Array(SECTION_COUNT);
  /** Continuous step position of each section. */
  readonly step = new Float32Array(SECTION_COUNT);
  /** Section index the camera frames. */
  focus = 0;
  /** Increments whenever the camera must cut rather than travel. */
  cuts = 0;
  /** Whether the latest cut should play an arrival move. */
  arrival = false;

  private readonly tracks: readonly Track[] = SECTIONS.map(() => ({
    presence: new Spring(0, springs.presence),
    reveal: new Spring(0, springs.reveal),
    step: new Spring(0, springs.step),
  }));
  private readonly ready = new Uint8Array(SECTION_COUNT);
  private transitionId: number | null = null;
  private pendingFocus: number | null = null;
  private incoming: number | null = null;
  private incomingAt = 0;
  private initialized = false;

  /** Re-synchronises with navigation on the next update (stage mount). */
  reset(): void {
    this.initialized = false;
    this.ready.fill(0);
    for (const track of this.tracks) track.reveal.snap(0);
  }

  /** Reported by the scene director as scenes become ready or are removed. */
  setReady(index: number, ready: boolean): void {
    this.ready[index] = ready ? 1 : 0;
  }

  /** Advances one frame. Returns whether anything is still moving. */
  update(tick: Tick): boolean {
    const navigation = navigationStore.getState();
    const tokens = environmentStore.getState().reducedMotion ? reducedSprings : springs;
    if (!this.initialized) this.initialize(navigation);

    const transition = navigation.transition;
    if (transition && transition.id !== this.transitionId)
      this.begin(transition, tick.time, tokens);

    if (this.incoming !== null && tick.time >= this.incomingAt) {
      const track = this.tracks[this.incoming];
      if (track) track.presence.target = 1;
      this.incoming = null;
    }
    if (this.pendingFocus !== null && this.othersGone(this.pendingFocus)) {
      this.cutTo(this.pendingFocus, tokens);
    }

    const current = section(navigation.current.section).index;
    let active = this.incoming !== null || this.pendingFocus !== null;
    for (let i = 0; i < this.tracks.length; i++) {
      const track = this.tracks[i];
      if (!track) continue;
      track.step.target = i === current ? navigation.current.step : (navigation.remembered[i] ?? 0);
      track.reveal.target = this.ready[i] ?? 0;
      if (track.presence.step(tick.delta)) active = true;
      if (track.reveal.step(tick.delta)) active = true;
      if (track.step.step(tick.delta)) active = true;
      const presence = track.presence.value * track.reveal.value;
      this.presence[i] = Math.min(Math.max(presence, 0), 1);
      this.step[i] = track.step.value;
    }
    return active;
  }

  private initialize(navigation: NavigationState): void {
    const current = section(navigation.current.section).index;
    this.tracks.forEach((track, i) => {
      track.presence.snap(i === current ? 1 : 0);
      track.step.snap(i === current ? navigation.current.step : (navigation.remembered[i] ?? 0));
    });
    this.focus = current;
    this.cuts += 1;
    this.arrival = false;
    this.pendingFocus = null;
    this.incoming = null;
    this.transitionId = navigation.transition?.id ?? null;
    this.initialized = true;
  }

  private begin(transition: Transition, now: number, tokens: Tokens): void {
    this.transitionId = transition.id;
    const to = section(transition.to.section).index;
    const target = this.tracks[to];
    if (!target) return;

    if (transition.kind === 'step') {
      target.step.configure(tokens.step);
      return;
    }

    // Arriving somewhere not visible: begin at the entry step rather than sweep to it.
    if (read(this.presence, to) < GONE) target.step.snap(transition.to.step);

    const outgoing = transition.choreography === 'cut' ? tokens.cutOut : tokens.presence;
    this.tracks.forEach((track, i) => {
      if (i === to) return;
      track.presence.configure(outgoing);
      track.presence.target = 0;
    });

    if (transition.choreography === 'travel') {
      this.pendingFocus = null;
      this.focus = to;
      this.arrival = false;
      target.presence.configure(tokens.presence);
      const beat = read(this.presence, to) > PARTLY_PRESENT ? 0 : transitions.travel.incomingAt;
      this.incoming = to;
      this.incomingAt = now + beat * transition.duration;
      return;
    }

    this.incoming = null;
    if (this.focus === to && read(this.presence, to) >= GONE) {
      // Still framed and visible (a reversal mid-cut): simply bring it back.
      this.pendingFocus = null;
      target.presence.configure(tokens.cutIn);
      target.presence.target = 1;
    } else {
      target.presence.target = 0;
      this.pendingFocus = to;
    }
  }

  private othersGone(index: number): boolean {
    for (let i = 0; i < SECTION_COUNT; i++) {
      if (i !== index && read(this.presence, i) >= GONE) return false;
    }
    return true;
  }

  private cutTo(index: number, tokens: Tokens): void {
    this.focus = index;
    this.pendingFocus = null;
    this.cuts += 1;
    this.arrival = !environmentStore.getState().reducedMotion;
    const track = this.tracks[index];
    if (!track) return;
    track.presence.configure(tokens.cutIn);
    track.presence.target = 1;
  }
}

export const choreographer = new Choreographer();
