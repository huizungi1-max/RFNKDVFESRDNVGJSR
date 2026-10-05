import {
  flight,
  reducedSprings,
  springs,
  type SpringName,
  type SpringToken,
} from '@/design/motion';
import { environmentStore } from '@/environment/store';
import { Spring } from '@/motion/spring';
import type { Transition } from '@/navigation/model';
import { navigationStore, type NavigationState } from '@/navigation/store';
import { SECTIONS, SECTION_COUNT, section } from '@/navigation/structure';
import type { Tick } from '@/runtime/ticker';

/** Veil opacity at which the camera may relocate unseen. */
const OPAQUE = 0.985;
/** A section below this activation is disengaged: enter it at its entry step. */
const DISENGAGED = 0.02;
/** A section above this is mid-transition: re-engaging it starts at once. */
const ENGAGED = 0.3;

type Tokens = Readonly<Record<SpringName, SpringToken>>;

interface Track {
  readonly activation: Spring;
  readonly reveal: Spring;
  readonly step: Spring;
}

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

/**
 * Turns discrete navigation into the stage's continuous values — and is their
 * only writer:
 *  - activation: how engaged each section is, 0–1. Sections are physical places,
 *    visible whenever loaded; activation drives a section's own transformation
 *    (level 2) and lighting emphasis (level 3) — never whether it can be seen.
 *  - reveal: a scene emerging once loaded and compiled, 0–1.
 *  - step: each section's continuous step position (camera rail and environment).
 *  - focus: the section the camera frames.
 *  - veil and cuts: reduced-motion relocations happen behind a brief veil.
 *
 * During travel the camera flies at once, the departing section disengages, and
 * the arriving one engages late in the flight — one major transformation at a
 * time, with the camera leading.
 */
export class Choreographer {
  readonly activation = new Float32Array(SECTION_COUNT);
  readonly reveal = new Float32Array(SECTION_COUNT);
  readonly step = new Float32Array(SECTION_COUNT);
  /** Section index the camera frames. */
  focus = 0;
  /** Increments whenever the camera must relocate without travelling. */
  cuts = 0;
  /** Reduced-motion veil opacity, 0–1. */
  veil = 0;

  private readonly tracks: readonly Track[] = SECTIONS.map(() => ({
    activation: new Spring(0, springs.activation),
    reveal: new Spring(0, springs.reveal),
    step: new Spring(0, springs.step),
  }));
  private readonly veilSpring = new Spring(0, springs.veil);
  private readonly ready = new Uint8Array(SECTION_COUNT);
  private transitionId: number | null = null;
  private incoming: number | null = null;
  private incomingAt = 0;
  /** A reduced-motion relocation waiting for the veil to close. */
  private pendingCut: number | null = null;
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
    const reduced = environmentStore.getState().reducedMotion;
    const tokens = reduced ? reducedSprings : springs;
    if (!this.initialized) this.initialize(navigation);

    const transition = navigation.transition;
    if (transition && transition.id !== this.transitionId) {
      this.begin(transition, tick.time, tokens, reduced);
    }
    if (this.incoming !== null && tick.time >= this.incomingAt) {
      const track = this.tracks[this.incoming];
      if (track) track.activation.target = 1;
      this.incoming = null;
    }
    if (this.pendingCut !== null && this.veilSpring.value >= OPAQUE) this.cut(navigation);

    const current = section(navigation.current.section).index;
    let active = this.incoming !== null || this.pendingCut !== null;
    for (let i = 0; i < this.tracks.length; i++) {
      const track = this.tracks[i];
      if (!track) continue;
      // While a relocation waits for the veil, positions hold; they jump at the cut.
      if (this.pendingCut === null) {
        track.step.target =
          i === current ? navigation.current.step : (navigation.remembered[i] ?? 0);
      }
      track.reveal.target = this.ready[i] ?? 0;
      if (track.activation.step(tick.delta)) active = true;
      if (track.reveal.step(tick.delta)) active = true;
      if (track.step.step(tick.delta)) active = true;
      this.activation[i] = clamp01(track.activation.value);
      this.reveal[i] = clamp01(track.reveal.value);
      this.step[i] = track.step.value;
    }
    this.veilSpring.configure(tokens.veil);
    if (this.veilSpring.step(tick.delta)) active = true;
    this.veil = clamp01(this.veilSpring.value);
    return active;
  }

  private initialize(navigation: NavigationState): void {
    const current = section(navigation.current.section).index;
    this.tracks.forEach((track, i) => {
      track.activation.snap(i === current ? 1 : 0);
      track.step.snap(i === current ? navigation.current.step : (navigation.remembered[i] ?? 0));
    });
    this.focus = current;
    this.cuts += 1;
    this.incoming = null;
    this.pendingCut = null;
    this.veilSpring.snap(0);
    this.transitionId = navigation.transition?.id ?? null;
    this.initialized = true;
  }

  private begin(transition: Transition, now: number, tokens: Tokens, reduced: boolean): void {
    this.transitionId = transition.id;
    const to = section(transition.to.section).index;
    const target = this.tracks[to];
    if (!target) return;

    if (reduced) {
      // The camera never travels: veil, relocate, unveil.
      this.incoming = null;
      this.pendingCut = to;
      this.veilSpring.target = 1;
      return;
    }
    this.pendingCut = null;
    this.veilSpring.target = 0;

    if (transition.kind === 'step') {
      target.step.configure(tokens.step);
      return;
    }

    // Arriving somewhere disengaged: begin at the entry step rather than sweep to it.
    if ((this.activation[to] ?? 0) < DISENGAGED) target.step.snap(transition.to.step);
    this.tracks.forEach((track, i) => {
      if (i === to) return;
      track.activation.configure(tokens.activation);
      track.activation.target = 0;
    });
    this.focus = to;
    target.activation.configure(tokens.activation);
    const beat = (this.activation[to] ?? 0) > ENGAGED ? 0 : flight.arrivalAt;
    this.incoming = to;
    this.incomingAt = now + beat * transition.duration;
  }

  /** Relocates behind the closed veil to wherever navigation now points, then unveils. */
  private cut(navigation: NavigationState): void {
    const index = section(navigation.current.section).index;
    this.pendingCut = null;
    this.focus = index;
    this.cuts += 1;
    this.tracks.forEach((track, i) => {
      track.activation.snap(i === index ? 1 : 0);
      track.step.snap(i === index ? navigation.current.step : (navigation.remembered[i] ?? 0));
    });
    this.veilSpring.target = 0;
  }
}

export const choreographer = new Choreographer();
