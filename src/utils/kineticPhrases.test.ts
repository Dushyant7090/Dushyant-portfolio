import test from 'node:test';
import assert from 'node:assert/strict';
import {
  KINETIC_PHRASES,
  accumulateWheelDelta,
  stepPhraseIndex,
} from './kineticPhrases';

test('KINETIC_PHRASES contains all 5 requested phrases in exact order', () => {
  assert.deepEqual(
    KINETIC_PHRASES.map((p) => p.text),
    [
      "HELLO, I'M DUSHYANT.",
      'BEYOND THE NUMBERS.',
      'CURIOUS ABOUT THE WHY.',
      'EXPLORING PATTERNS.',
      'TURNING COMPLEXITY INTO CLARITY.',
    ]
  );
});

test('stepPhraseIndex wraps cleanly forward and backward', () => {
  assert.equal(stepPhraseIndex(0, 1, 5), 1);
  assert.equal(stepPhraseIndex(4, 1, 5), 0);
  assert.equal(stepPhraseIndex(0, -1, 5), 4);
});

test('accumulateWheelDelta debounces small trackpad micro-deltas and resets on direction change', () => {
  const s1 = accumulateWheelDelta(0, 20, 45);
  assert.equal(s1.step, 0);
  assert.equal(s1.nextAccumulator, 20);

  const s2 = accumulateWheelDelta(s1.nextAccumulator, 30, 45);
  assert.equal(s2.step, 1);
  assert.equal(s2.nextAccumulator, 0);

  // Direction reversal discards prior positive accumulator
  const rev = accumulateWheelDelta(35, -50, 45);
  assert.equal(rev.step, -1);
  assert.equal(rev.nextAccumulator, 0);
});
