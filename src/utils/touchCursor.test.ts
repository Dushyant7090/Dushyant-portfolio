import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TOUCH_HOLD_MS,
  createInitialTouchState,
  endTouchGesture,
  evaluateTouchHold,
  markTouchScrolling,
  startTouchGesture,
  stepTouchMove,
} from './touchCursor';

test('vertical swipe suppresses custom cursor by transitioning to scrolling', () => {
  const s0 = startTouchGesture(180, 400, 1, 1000);
  assert.equal(s0.phase, 'pending');

  // Vertical movement of 12px within 50ms -> classified as vertical scroll
  const s1 = stepTouchMove(s0, 182, 412, 1050);
  assert.equal(s1.phase, 'scrolling');

  // Subsequent moves in the same swipe remain suppressed
  const s2 = stepTouchMove(s1, 220, 420, 1200);
  assert.equal(s2.phase, 'scrolling');
});

test('press-and-hold activates dragging after hold duration without scroll', () => {
  const s0 = startTouchGesture(180, 400, 1, 1000);

  // Before hold threshold -> still pending
  const tooEarly = evaluateTouchHold(s0, 1000 + TOUCH_HOLD_MS - 30);
  assert.equal(tooEarly.phase, 'pending');

  // After hold threshold -> activates dragging
  const held = evaluateTouchHold(s0, 1000 + TOUCH_HOLD_MS);
  assert.equal(held.phase, 'dragging');

  // Once dragging, vertical finger exploration keeps cursor & trail active
  const moved = stepTouchMove(held, 185, 450, 1250);
  assert.equal(moved.phase, 'dragging');
  assert.equal(moved.x, 185);
  assert.equal(moved.y, 450);
});

test('deliberate horizontal drag activates dragging immediately', () => {
  const s0 = startTouchGesture(120, 300, 2, 2000);
  const s1 = stepTouchMove(s0, 142, 304, 2040);
  assert.equal(s1.phase, 'dragging');
});

test('native scroll event overrides active touch gesture and resets on release', () => {
  const s0 = startTouchGesture(120, 300, 1, 1000);
  const held = evaluateTouchHold(s0, 1000 + TOUCH_HOLD_MS);
  assert.equal(held.phase, 'dragging');

  const scrolled = markTouchScrolling(held);
  assert.equal(scrolled.phase, 'scrolling');

  const ended = endTouchGesture();
  assert.deepEqual(ended, createInitialTouchState());
});
