export interface KineticPhrase {
  id: string;
  index: string;
  text: string;
}

export const KINETIC_PHRASES: readonly KineticPhrase[] = [
  { id: 'hello', index: '01', text: "HELLO, I'M DUSHYANT." },
  { id: 'beyond', index: '02', text: 'BEYOND THE NUMBERS.' },
  { id: 'curious', index: '03', text: 'CURIOUS ABOUT THE WHY.' },
  { id: 'patterns', index: '04', text: 'EXPLORING PATTERNS.' },
  { id: 'clarity', index: '05', text: 'TURNING COMPLEXITY INTO CLARITY.' },
];

export function stepPhraseIndex(
  currentIndex: number,
  delta: number,
  total: number = KINETIC_PHRASES.length
): number {
  if (total <= 0) {
    return 0;
  }
  return (((currentIndex + delta) % total) + total) % total;
}

/**
 * Accumulates trackpad wheel deltas and emits a single step (-1 | 0 | 1)
 * once the threshold is crossed so smooth MacBook/trackpad inertia doesn't skip phrases.
 */
export function accumulateWheelDelta(
  currentAccumulator: number,
  deltaY: number,
  threshold = 45
): { nextAccumulator: number; step: -1 | 0 | 1 } {
  if (Math.abs(deltaY) < 1) {
    return { nextAccumulator: currentAccumulator, step: 0 };
  }

  // Reset accumulator if user reverses scroll direction
  const sameDirection =
    currentAccumulator === 0 ||
    Math.sign(currentAccumulator) === Math.sign(deltaY);
  const next = (sameDirection ? currentAccumulator : 0) + deltaY;

  if (next >= threshold) {
    return { nextAccumulator: 0, step: 1 };
  }
  if (next <= -threshold) {
    return { nextAccumulator: 0, step: -1 };
  }
  return { nextAccumulator: next, step: 0 };
}
