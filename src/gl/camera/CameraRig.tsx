import { useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo } from 'react';
import { PerspectiveCamera, Vector3 } from 'three';

import { flight, reducedSprings, springs } from '@/design/motion';
import type { LayoutClass } from '@/environment/profile';
import { environmentStore } from '@/environment/store';
import { pointer } from '@/input/pointer';
import { Spring } from '@/motion/spring';
import { navigationStore } from '@/navigation/store';
import { ticker } from '@/runtime/ticker';
import { fitVerticalFov } from '@/sections/framing';
import { flightArc, isDistant } from '@/sections/passage';
import { SECTION_DEFINITIONS, createShotFrame } from '@/sections/registry';

import { choreographer } from '../choreographer';
import {
  FOV,
  Flight,
  POSITION,
  TARGET,
  createChannels,
  flightIntensity,
  type Channels,
} from './flight';
import { cameraState } from './state';

/** Runs before every scene's frame callback, so scenes always see this frame's camera. */
export const CAMERA_FRAME_PRIORITY = -100;

/** Clip planes sized for a world with deep, far-reaching views. */
const NEAR = 0.2;
const FAR = 1500;

/**
 * The single owner of the camera — the primary motion instrument.
 *
 *  - On a section transition it flies: one large C²-continuous movement along an
 *    arc (distant jumps pull far back to reveal the environment), timed by the
 *    navigation transition so the interface settles with it.
 *  - Within a section it rides the section's rail: the framing at the continuous
 *    step position, which the choreographer already moves smoothly.
 *  - Reduced-motion relocations are cuts behind the veil.
 *  - Once settled it is perfectly still, unless a framing opts into parallax.
 *
 * Any transition can interrupt any other: a new flight begins from the camera's
 * current position, velocity and acceleration, so the camera never jolts or
 * enters an invalid state.
 */
class Rig {
  readonly camera = new PerspectiveCamera(34, 1, NEAR, FAR);

  private readonly frame = createShotFrame();
  private readonly desired = createChannels();
  private readonly value = createChannels();
  private readonly velocity = createChannels();
  private readonly acceleration = createChannels();
  private readonly arc = createChannels();
  private readonly flight = new Flight();
  private readonly arcPoint = { x: 0, y: 0, z: 0 };
  private readonly start = { x: 0, y: 0, z: 0 };
  private readonly end = { x: 0, y: 0, z: 0 };
  private readonly parallaxX = new Spring(0, springs.parallax);
  private readonly parallaxY = new Spring(0, springs.parallax);
  private readonly look = new Vector3();
  private readonly forward = new Vector3();
  private readonly right = new Vector3();
  private readonly up = new Vector3();
  private cuts = -1;
  private transitionId: number | null = null;
  private layout: LayoutClass | null = null;
  /** Time (ms) the camera state was last computed for. */
  private sampledAt = 0;

  /** Advances one frame. Returns whether the camera is still moving. */
  update(time: number, delta: number, aspect: number): boolean {
    const environment = environmentStore.getState();
    const reduced = environment.reducedMotion;
    if (!this.writeDesired(environment.viewport.layout, aspect)) return false;

    // Placement and reduced-motion relocations: jump, at rest.
    if (choreographer.cuts !== this.cuts) {
      this.cuts = choreographer.cuts;
      this.value.set(this.desired);
      this.velocity.fill(0);
      this.acceleration.fill(0);
      this.flight.active = false;
    }

    const transition = navigationStore.getState().transition;
    if (transition && transition.id !== this.transitionId) {
      this.transitionId = transition.id;
      if (transition.kind === 'section' && transition.choreography === 'travel') {
        this.fly(
          time,
          transition.duration / 1000,
          isDistant(transition.from.section, transition.to.section),
          true,
        );
      }
    }
    if (
      this.layout !== null &&
      environment.viewport.layout !== this.layout &&
      !this.flight.active
    ) {
      // The framing changed with the layout: re-frame in one short move rather than jump.
      this.fly(time, flight.reframe / 1000, false, false);
    }
    this.layout = environment.viewport.layout;

    let moving = false;
    if (this.flight.active) {
      const progress = this.flight.sample(
        time,
        this.desired,
        this.value,
        this.velocity,
        this.acceleration,
      );
      cameraState.mode = 'flight';
      cameraState.progress = progress;
      cameraState.intensity = flightIntensity(progress);
      moving = true;
    } else {
      // On the rail the framing is already smooth: follow it exactly, and track its
      // velocity so a flight starting from here inherits the camera's momentum.
      const dt = Math.max(delta, 1e-4);
      for (let i = 0; i < this.value.length; i++) {
        const next = this.desired[i] ?? 0;
        this.velocity[i] = (next - (this.value[i] ?? 0)) / dt;
        this.value[i] = next;
      }
      this.acceleration.fill(0);
      cameraState.mode = 'rail';
      cameraState.progress = 1;
      cameraState.intensity = 0;
    }

    this.sampledAt = time;
    if (this.apply(delta, reduced, environment.pointer === 'fine')) moving = true;
    return moving;
  }

  /** The focused section's framing at its continuous step, in world space. */
  private writeDesired(layout: LayoutClass, aspect: number): boolean {
    const definition = SECTION_DEFINITIONS[choreographer.focus];
    if (!definition) return false;
    const { stage } = definition;
    const frame = this.frame;
    stage.frame(choreographer.step[choreographer.focus] ?? 0, layout, frame);
    const [ax, ay, az] = stage.anchor;
    const d = this.desired;
    d[POSITION] = frame.position[0] + ax;
    d[POSITION + 1] = frame.position[1] + ay;
    d[POSITION + 2] = frame.position[2] + az;
    d[TARGET] = frame.target[0] + ax;
    d[TARGET + 1] = frame.target[1] + ay;
    d[TARGET + 2] = frame.target[2] + az;
    d[FOV] = fitVerticalFov(frame.fov, frame.minHorizontalFov, aspect);
    return true;
  }

  private fly(time: number, seconds: number, distant: boolean, arced: boolean): void {
    // The state on hand was computed for the previous frame. Carry it forward to
    // now, so the new flight continues from where the camera actually is rather
    // than holding still for a frame.
    const dt = Math.min(Math.max((time - this.sampledAt) / 1000, 0), 0.1);
    for (let i = 0; i < this.value.length; i++) {
      const v = this.velocity[i] ?? 0;
      const a = this.acceleration[i] ?? 0;
      this.value[i] = (this.value[i] ?? 0) + v * dt + 0.5 * a * dt * dt;
      this.velocity[i] = v + a * dt;
    }

    this.arc.fill(0);
    if (arced) {
      read(this.value, POSITION, this.start);
      read(this.desired, POSITION, this.end);
      flightArc(this.start, this.end, distant, this.arcPoint);
      this.arc[POSITION] = this.arcPoint.x;
      this.arc[POSITION + 1] = this.arcPoint.y;
      this.arc[POSITION + 2] = this.arcPoint.z;
      if (distant) this.arc[FOV] = flight.revealFov;
    }
    this.flight.begin(time, seconds, this.value, this.velocity, this.acceleration, this.arc);
  }

  /**
   * Writes the camera. Parallax applies only where the framing opts in — never in
   * flight, never with reduced motion. Returns whether parallax is still moving.
   */
  private apply(delta: number, reduced: boolean, finePointer: boolean): boolean {
    const camera = this.camera;
    const v = this.value;
    camera.position.set(v[POSITION] ?? 0, v[POSITION + 1] ?? 0, v[POSITION + 2] ?? 0);
    this.look.set(v[TARGET] ?? 0, v[TARGET + 1] ?? 0, v[TARGET + 2] ?? 0);

    const amount = this.frame.parallax;
    const engaged = amount > 0 && !reduced && finePointer && pointer.active && !this.flight.active;
    const tokens = reduced ? reducedSprings : springs;
    this.parallaxX.configure(tokens.parallax);
    this.parallaxY.configure(tokens.parallax);
    this.parallaxX.target = engaged ? pointer.x : 0;
    this.parallaxY.target = engaged ? pointer.y : 0;
    const movingX = this.parallaxX.step(delta);
    const movingY = this.parallaxY.step(delta);
    const px = this.parallaxX.value;
    const py = this.parallaxY.value;
    if (px !== 0 || py !== 0) {
      const reach = camera.position.distanceTo(this.look) * amount;
      this.forward.subVectors(this.look, camera.position).normalize();
      this.right.crossVectors(this.forward, camera.up).normalize();
      this.up.crossVectors(this.right, this.forward);
      camera.position.addScaledVector(this.right, px * reach).addScaledVector(this.up, py * reach);
    }
    camera.lookAt(this.look);

    const fov = v[FOV] ?? 34;
    if (camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    cameraState.position.x = camera.position.x;
    cameraState.position.y = camera.position.y;
    cameraState.position.z = camera.position.z;
    cameraState.fov = fov;
    return movingX || movingY;
  }
}

function read(channels: Channels, offset: number, out: { x: number; y: number; z: number }): void {
  out.x = channels[offset] ?? 0;
  out.y = channels[offset + 1] ?? 0;
  out.z = channels[offset + 2] ?? 0;
}

export function CameraRig() {
  const set = useThree((state) => state.set);
  const rig = useMemo(() => new Rig(), []);

  useLayoutEffect(() => {
    set({ camera: rig.camera });
  }, [rig, set]);

  useFrame((state, delta) => {
    const aspect = state.size.width / Math.max(state.size.height, 1);
    if (rig.camera.aspect !== aspect) {
      rig.camera.aspect = aspect;
      rig.camera.updateProjectionMatrix();
    }
    // Sampled at the frame's own timestamp: motion paces exactly with the display.
    if (rig.update(ticker.time, delta, aspect)) ticker.wake();
  }, CAMERA_FRAME_PRIORITY);

  return null;
}
