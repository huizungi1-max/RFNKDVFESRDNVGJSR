import { useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo } from 'react';
import { PerspectiveCamera, Vector3 } from 'three';

import { amplitude, reducedSprings, springs, type SpringToken } from '@/design/motion';
import { environmentStore } from '@/environment/store';
import { pointer } from '@/input/pointer';
import { Spring } from '@/motion/spring';
import { navigationStore } from '@/navigation/store';
import { ticker } from '@/runtime/ticker';
import { fitVerticalFov } from '@/sections/framing';
import { SECTION_DEFINITIONS } from '@/sections/registry';
import type { ShotFrame } from '@/sections/types';

import { choreographer } from '../choreographer';

/** Runs before every scene's frame callback, so scenes always see this frame's camera. */
export const CAMERA_FRAME_PRIORITY = -100;

class SpringVector {
  private readonly x: Spring;
  private readonly y: Spring;
  private readonly z: Spring;

  constructor(token: SpringToken) {
    this.x = new Spring(0, token);
    this.y = new Spring(0, token);
    this.z = new Spring(0, token);
  }

  configure(token: SpringToken): void {
    this.x.configure(token);
    this.y.configure(token);
    this.z.configure(token);
  }

  snap(value: Vector3): void {
    this.x.snap(value.x);
    this.y.snap(value.y);
    this.z.snap(value.z);
  }

  aim(value: Vector3): void {
    this.x.target = value.x;
    this.y.target = value.y;
    this.z.target = value.z;
  }

  step(dt: number): boolean {
    const x = this.x.step(dt);
    const y = this.y.step(dt);
    const z = this.z.step(dt);
    return x || y || z;
  }

  read(out: Vector3): Vector3 {
    return out.set(this.x.value, this.y.value, this.z.value);
  }
}

/**
 * The single owner of the camera. Sections describe framings; the rig decides how
 * the camera gets there:
 *  - follows the focused section's framing for its continuous step position;
 *  - travels on a smooth-start spring between adjacent sections, follows briskly
 *    within one, and cuts (with a short arrival) when the choreographer says so;
 *  - keeps the subject's horizontal framing on tall viewports;
 *  - adds pointer parallax for fine pointers — never with reduced motion.
 * Retargeting mid-move keeps position and velocity, so input during a transition
 * can never leave the camera in an invalid state.
 */
class Rig {
  readonly camera = new PerspectiveCamera(36, 1, 0.1, 400);

  private readonly frame: ShotFrame = {
    position: [0, 0, 10],
    target: [0, 0, 0],
    fov: 36,
    minHorizontalFov: 60,
  };
  private readonly desiredPosition = new Vector3();
  private readonly desiredTarget = new Vector3();
  private readonly position = new SpringVector(springs.follow);
  private readonly target = new SpringVector(springs.follow);
  private readonly fov = new Spring(36, springs.follow, 1e-3);
  private readonly parallaxX = new Spring(0, springs.parallax);
  private readonly parallaxY = new Spring(0, springs.parallax);
  private readonly look = new Vector3();
  private readonly forward = new Vector3();
  private readonly right = new Vector3();
  private readonly up = new Vector3();
  private cuts = -1;

  /** Advances one frame. Returns whether the camera is still moving. */
  update(delta: number, aspect: number): boolean {
    const environment = environmentStore.getState();
    const reduced = environment.reducedMotion;
    const definition = SECTION_DEFINITIONS[choreographer.focus];
    if (!definition) return false;

    const { stage } = definition;
    stage.frame(
      choreographer.step[choreographer.focus] ?? 0,
      environment.viewport.layout,
      this.frame,
    );
    const [ax, ay, az] = stage.anchor;
    const { position, target } = this.frame;
    this.desiredPosition.set(position[0] + ax, position[1] + ay, position[2] + az);
    this.desiredTarget.set(target[0] + ax, target[1] + ay, target[2] + az);
    const desiredFov = fitVerticalFov(this.frame.fov, this.frame.minHorizontalFov, aspect);

    const tokens = reduced ? reducedSprings : springs;
    const travelling = navigationStore.getState().transition?.choreography === 'travel';
    const token = travelling ? tokens.travel : tokens.follow;
    this.position.configure(token);
    this.target.configure(token);
    this.fov.configure(token);

    if (choreographer.cuts !== this.cuts) {
      this.cuts = choreographer.cuts;
      this.position.snap(this.desiredPosition);
      this.target.snap(this.desiredTarget);
      this.fov.snap(desiredFov);
      if (choreographer.arrival) {
        // Begin slightly pulled back, then settle into the framing.
        this.look
          .subVectors(this.desiredPosition, this.desiredTarget)
          .multiplyScalar(amplitude.arrival)
          .add(this.desiredPosition);
        this.position.snap(this.look);
      }
    }

    let active = false;
    if (reduced) {
      this.position.snap(this.desiredPosition);
      this.target.snap(this.desiredTarget);
      this.fov.snap(desiredFov);
    } else {
      this.position.aim(this.desiredPosition);
      this.target.aim(this.desiredTarget);
      this.fov.target = desiredFov;
      if (this.position.step(delta)) active = true;
      if (this.target.step(delta)) active = true;
      if (this.fov.step(delta)) active = true;
    }

    const parallax = !reduced && environment.pointer === 'fine' && pointer.active;
    this.parallaxX.target = parallax ? pointer.x : 0;
    this.parallaxY.target = parallax ? pointer.y : 0;
    if (this.parallaxX.step(delta)) active = true;
    if (this.parallaxY.step(delta)) active = true;

    const camera = this.camera;
    this.position.read(camera.position);
    this.target.read(this.look);
    const px = this.parallaxX.value;
    const py = this.parallaxY.value;
    if (px !== 0 || py !== 0) {
      const reach = camera.position.distanceTo(this.look) * amplitude.parallax;
      this.forward.subVectors(this.look, camera.position).normalize();
      this.right.crossVectors(this.forward, camera.up).normalize();
      this.up.crossVectors(this.right, this.forward);
      camera.position.addScaledVector(this.right, px * reach).addScaledVector(this.up, py * reach);
    }
    camera.lookAt(this.look);

    const fov = this.fov.value;
    if (camera.fov !== fov || camera.aspect !== aspect) {
      camera.fov = fov;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    }
    return active;
  }
}

export function CameraRig() {
  const set = useThree((state) => state.set);
  const rig = useMemo(() => new Rig(), []);

  useLayoutEffect(() => {
    set({ camera: rig.camera });
  }, [rig, set]);

  useFrame((state, delta) => {
    const aspect = state.size.width / Math.max(state.size.height, 1);
    if (rig.update(delta, aspect)) ticker.wake();
  }, CAMERA_FRAME_PRIORITY);

  return null;
}
