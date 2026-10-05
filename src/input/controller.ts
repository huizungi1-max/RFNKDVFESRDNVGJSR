import type { NavigationCause } from '@/navigation/model';
import { navigationStore } from '@/navigation/store';
import { ticker } from '@/runtime/ticker';

import { intentForAxis, type Axis, type Intent } from './intent';
import { keyIntent } from './keys';
import { pointer } from './pointer';
import { SwipeGesture } from './swipe';
import { WheelGesture, isNotched, wheelDeltas } from './wheel';

/**
 * The only owner of global input listeners. Raw events become device-independent
 * intents, which become navigation actions. No component attaches its own wheel,
 * touch, or key handlers for navigation, so no gesture is ever handled twice.
 *
 * Native scrolling keeps priority: a gesture that begins over content that can
 * still scroll in that direction belongs to the content for its whole duration —
 * it never chains into a transition.
 */

/** Opt-out: descendants of `[data-gestures="native"]` keep native wheel/touch behaviour. */
const NATIVE_REGION = '[data-gestures="native"]';

function canScroll(target: EventTarget | null, axis: Axis, direction: number): boolean {
  let element = target instanceof Element ? target : null;
  while (element && element !== document.body && element !== document.documentElement) {
    if (element instanceof HTMLElement) {
      const style = getComputedStyle(element);
      const overflow = axis === 'y' ? style.overflowY : style.overflowX;
      if (overflow === 'auto' || overflow === 'scroll') {
        const position = axis === 'y' ? element.scrollTop : element.scrollLeft;
        const room =
          axis === 'y'
            ? element.scrollHeight - element.clientHeight
            : element.scrollWidth - element.clientWidth;
        if (direction > 0 ? position < room - 1 : position > 0) return true;
      }
    }
    element = element.parentElement;
  }
  return false;
}

function ownsNatively(target: EventTarget | null, axis: Axis, direction: number): boolean {
  if (target instanceof Element && target.closest(NATIVE_REGION)) return true;
  return canScroll(target, axis, direction);
}

function dispatch(intent: Intent, cause: NavigationCause): void {
  const navigation = navigationStore.getState();
  if (intent.kind === 'linear') navigation.advance(intent.direction, cause);
  else if (intent.kind === 'within') navigation.advanceWithin(intent.direction, cause);
  else navigation.goToEdge(intent.edge, cause);
}

function onKeyDown(event: KeyboardEvent): void {
  const result = keyIntent(event);
  if (result === null) return;
  event.preventDefault();
  if (result !== 'swallow') dispatch(result, 'keyboard');
}

function onPointerMove(event: PointerEvent): void {
  if (event.pointerType === 'touch') return;
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = 1 - (event.clientY / window.innerHeight) * 2;
  pointer.active = true;
  ticker.wake();
}

function onPointerExit(): void {
  pointer.active = false;
  ticker.wake();
}

function onDocumentPointerOut(event: PointerEvent): void {
  if (event.relatedTarget === null) onPointerExit();
}

/** Attaches every input listener. Returns the cleanup function. */
export function startInput(): () => void {
  const wheel = new WheelGesture();
  const swipe = new SwipeGesture();
  let wheelIsNative = false;
  let touchTarget: EventTarget | null = null;

  const onWheel = (event: WheelEvent) => {
    if (event.ctrlKey) return; // pinch-zoom on trackpads
    const { dx, dy } = wheelDeltas(event);
    const result = wheel.push({ dx, dy, time: event.timeStamp, notched: isNotched(event) });
    if (result.gestureStart) {
      const axis: Axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      wheelIsNative = ownsNatively(event.target, axis, Math.sign(axis === 'x' ? dx : dy));
    }
    if (wheelIsNative) return;
    // Also stops elastic overscroll and the horizontal history-swipe gesture.
    event.preventDefault();
    if (result.intent)
      dispatch(intentForAxis(result.intent.axis, result.intent.direction), 'gesture');
  };

  const onTouchStart = (event: TouchEvent) => {
    const touch = event.touches[0];
    const zoomed = (window.visualViewport?.scale ?? 1) > 1.01;
    if (event.touches.length !== 1 || !touch || zoomed) {
      swipe.cancel();
      return;
    }
    touchTarget = event.target;
    swipe.begin({ x: touch.clientX, y: touch.clientY, time: event.timeStamp });
  };

  const onTouchMove = (event: TouchEvent) => {
    const touch = event.touches[0];
    if (!swipe.tracking || !touch) return;
    if (event.touches.length !== 1) {
      swipe.cancel();
      return;
    }
    const locked = swipe.move({ x: touch.clientX, y: touch.clientY, time: event.timeStamp });
    // Content scrolls under the finger opposite to the swipe direction.
    if (locked && ownsNatively(touchTarget, locked.axis, -Math.sign(locked.travel))) swipe.cancel();
  };

  const onTouchEnd = (event: TouchEvent) => {
    const touch = event.changedTouches[0];
    if (!swipe.tracking || !touch) return;
    const result = swipe.end(
      { x: touch.clientX, y: touch.clientY, time: event.timeStamp },
      { width: window.innerWidth, height: window.innerHeight },
    );
    if (result) dispatch(intentForAxis(result.axis, result.direction), 'gesture');
  };

  const cancelSwipe = () => swipe.cancel();
  const passive = { passive: true } as const;
  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('touchstart', onTouchStart, passive);
  window.addEventListener('touchmove', onTouchMove, passive);
  window.addEventListener('touchend', onTouchEnd, passive);
  window.addEventListener('touchcancel', cancelSwipe, passive);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('pointermove', onPointerMove, passive);
  document.addEventListener('pointerout', onDocumentPointerOut, passive);
  window.addEventListener('blur', onPointerExit);

  return () => {
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('touchend', onTouchEnd);
    window.removeEventListener('touchcancel', cancelSwipe);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerout', onDocumentPointerOut);
    window.removeEventListener('blur', onPointerExit);
  };
}
