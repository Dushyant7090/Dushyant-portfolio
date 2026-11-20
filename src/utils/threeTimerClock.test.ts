import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createThreeTimerClock,
  shouldSuppressThreeDeprecationWarning,
} from './threeTimerClock';

test('shouldSuppressThreeDeprecationWarning only filters deprecated THREE.Clock warnings', () => {
  assert.equal(
    shouldSuppressThreeDeprecationWarning(
      'warn',
      'THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.',
    ),
    true,
  );
  assert.equal(
    shouldSuppressThreeDeprecationWarning('warn', 'THREE.WebGLRenderer: Context Lost.'),
    false,
  );
  assert.equal(
    shouldSuppressThreeDeprecationWarning(
      'error',
      'THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.',
    ),
    false,
  );
});

test('createThreeTimerClock implements Clock lifecycle using THREE.Timer without deprecated warnings', async () => {
  const clock = createThreeTimerClock(null);
  assert.equal(clock.running, false);

  // First call auto-starts and returns 0 delta cleanly
  const firstDelta = clock.getDelta();
  assert.equal(firstDelta, 0);
  assert.equal(clock.running, true);

  await new Promise((resolve) => setTimeout(resolve, 25));
  const nextDelta = clock.getDelta();
  assert.ok(nextDelta > 0, `Expected positive delta from THREE.Timer, got ${nextDelta}`);
  assert.ok(clock.elapsedTime >= nextDelta);

  // Resetting elapsedTime behaves cleanly for frameloop='never' overrides
  clock.elapsedTime = 0;
  assert.ok(Math.abs(clock.elapsedTime) < 0.005);

  clock.stop();
  assert.equal(clock.running, false);
  assert.equal(clock.getDelta(), 0);

  clock.dispose();
});
