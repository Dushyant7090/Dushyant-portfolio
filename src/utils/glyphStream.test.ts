import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeCellActivation,
  createSplashBurst,
  createTrailNode,
  hexToRgb,
  lerpRgbColor,
  pickStreamGlyph,
  stepTrailNodes,
} from './glyphStream';

test('hexToRgb and lerpRgbColor interpolate cleanly between head and tail colors', () => {
  const head = hexToRgb('#2156E7');
  const tail = hexToRgb('#93B4FF');
  assert.deepEqual(head, [33, 86, 231]);
  assert.deepEqual(lerpRgbColor(head, tail, 0), head);
  assert.deepEqual(lerpRgbColor(head, tail, 1), tail);
  const mid = lerpRgbColor(head, tail, 0.5);
  assert.ok(mid[0] > head[0] && mid[0] < tail[0]);
});

test('stepTrailNodes advances positions, damps velocity, and prunes expired nodes', () => {
  const n = createTrailNode(100, 100, 300, 0, 26, 1, 0.4);
  const afterStep = stepTrailNodes([n], 0.1);
  assert.equal(afterStep.length, 1);
  assert.ok(afterStep[0].x > 100);
  assert.ok(afterStep[0].vx < n.vx);

  // Advance past maxAge -> pruned
  const expired = stepTrailNodes([n], 0.05);
  let cur = expired;
  for (let i = 0; i < 10; i++) {
    cur = stepTrailNodes(cur, 0.05);
  }
  assert.equal(cur.length, 0);
});

test('createSplashBurst creates radial droplets around click coordinates', () => {
  const burst = createSplashBurst(200, 200, 8, 22, 0.5);
  assert.equal(burst.length, 8);
  assert.ok(burst.some((b) => b.vx > 0));
  assert.ok(burst.some((b) => b.vx < 0));
});

test('computeCellActivation activates cells inside node radius and ignores distant cells', () => {
  const node = createTrailNode(100, 100, 0, 0, 30, 1, 0.6);
  const near = computeCellActivation(102, 102, [node]);
  const far = computeCellActivation(400, 400, [node]);

  assert.ok(near.intensity > 0.5);
  assert.equal(far.intensity, 0);
});

test('pickStreamGlyph returns deterministic characters from glyph pool', () => {
  const ch = pickStreamGlyph(4, 9, 2, 'AB01@#');
  assert.ok('AB01@#'.includes(ch));
});
