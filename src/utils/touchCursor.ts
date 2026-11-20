export type TouchGesturePhase = 'idle' | 'pending' | 'dragging' | 'scrolling';

export interface TouchGestureState {
  phase: TouchGesturePhase;
  pointerId: number | null;
  startX: number;
  startY: number;
  x: number;
  y: number;
  startTime: number;
}

export const TOUCH_HOLD_MS = 170;
export const TOUCH_SCROLL_THRESHOLD_PX = 8;
export const TOUCH_HORIZONTAL_DRAG_THRESHOLD_PX = 14;
export const TOUCH_SCROLL_SLOPE_RATIO = 1.1;
export const TOUCH_HOLD_DRIFT_TOLERANCE_PX = 10;

export function createInitialTouchState(): TouchGestureState {
  return {
    phase: 'idle',
    pointerId: null,
    startX: 0,
    startY: 0,
    x: 0,
    y: 0,
    startTime: 0,
  };
}

export function startTouchGesture(
  x: number,
  y: number,
  pointerId: number,
  nowMs: number
): TouchGestureState {
  return {
    phase: 'pending',
    pointerId,
    startX: x,
    startY: y,
    x,
    y,
    startTime: nowMs,
  };
}

export function evaluateTouchHold(
  state: TouchGestureState,
  nowMs: number
): TouchGestureState {
  if (state.phase !== 'pending') {
    return state;
  }
  const drift = Math.hypot(state.x - state.startX, state.y - state.startY);
  if (drift <= TOUCH_HOLD_DRIFT_TOLERANCE_PX && nowMs - state.startTime >= TOUCH_HOLD_MS) {
    return {
      ...state,
      phase: 'dragging',
    };
  }
  return state;
}

/**
 * Classifies touch movement from initial contact to separate deliberate
 * press-and-hold dragging from natural vertical browser scrolling.
 */
export function stepTouchMove(
  state: TouchGestureState,
  x: number,
  y: number,
  nowMs: number
): TouchGestureState {
  if (state.phase === 'idle' || state.phase === 'scrolling') {
    return state;
  }

  if (state.phase === 'dragging') {
    return {
      ...state,
      x,
      y,
    };
  }

  // state.phase === 'pending'
  const dx = x - state.startX;
  const dy = y - state.startY;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  const dist = Math.hypot(dx, dy);

  // Vertical swipe takes priority -> suppress custom cursor & trail for this gesture
  if (absDy >= TOUCH_SCROLL_THRESHOLD_PX && absDy >= absDx * TOUCH_SCROLL_SLOPE_RATIO) {
    return {
      ...state,
      phase: 'scrolling',
      x,
      y,
    };
  }

  // Strong lateral drag activates cursor trail immediately
  if (absDx >= TOUCH_HORIZONTAL_DRAG_THRESHOLD_PX && absDx > absDy * 1.45) {
    return {
      ...state,
      phase: 'dragging',
      x,
      y,
    };
  }

  // Press-and-hold held long enough without scrolling -> activate
  if (dist <= TOUCH_HOLD_DRIFT_TOLERANCE_PX && nowMs - state.startTime >= TOUCH_HOLD_MS) {
    return {
      ...state,
      phase: 'dragging',
      x,
      y,
    };
  }

  return {
    ...state,
    x,
    y,
  };
}

export function markTouchScrolling(state: TouchGestureState): TouchGestureState {
  if (state.phase === 'idle') {
    return state;
  }
  return {
    ...state,
    phase: 'scrolling',
  };
}

export function endTouchGesture(): TouchGestureState {
  return createInitialTouchState();
}

export function syncTouchHoverTargets(
  nextSet: Set<Element>,
  prevSet: Set<Element>
): Set<Element> {
  prevSet.forEach((el) => {
    if (!nextSet.has(el)) {
      el.removeAttribute('data-touch-hover');
    }
  });
  nextSet.forEach((el) => {
    if (!prevSet.has(el)) {
      el.setAttribute('data-touch-hover', 'true');
    }
  });
  return nextSet;
}

export function collectTouchHoverTargetsAtPoint(
  x: number,
  y: number,
  selector = 'a, button, .glass-project-card, [data-touch-hoverable]'
): Set<Element> {
  const collected = new Set<Element>();
  if (typeof document === 'undefined' || typeof document.elementFromPoint !== 'function') {
    return collected;
  }

  let current: Element | null = document.elementFromPoint(x, y);
  while (current) {
    if (typeof current.matches === 'function' && current.matches(selector)) {
      collected.add(current);
    }
    current = current.parentElement;
  }
  return collected;
}
