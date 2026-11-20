import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DENSITY_BUCKETS,
  getInkColor,
  getLuminance,
  pickAsciiChar,
  samplePixelToCell,
  stepLensState,
} from './asciiPortrait';

test('DENSITY_BUCKETS spans letters, numbers, and special characters', () => {
  const combined = DENSITY_BUCKETS.join('');
  assert.match(combined, /[A-Z]/, 'includes uppercase letters');
  assert.match(combined, /[a-z]/, 'includes lowercase letters');
  assert.match(combined, /[0-9]/, 'includes numbers');
  assert.match(combined, /[@#$%&*+=?!/:;~.\-]/, 'includes special characters');
});

test('samplePixelToCell returns null for transparent pixels', () => {
  assert.equal(samplePixelToCell(20, 20, 20, 0, 5, 5), null);
  assert.equal(samplePixelToCell(20, 20, 20, 25, 5, 5), null);
});

test('dark pixels pick from dense shadow bucket and bright pixels pick from sparse bucket', () => {
  const darkChar = pickAsciiChar(10, 3, 7, 0);
  assert.ok(DENSITY_BUCKETS[0].includes(darkChar));

  const lightChar = pickAsciiChar(250, 3, 7, 0);
  assert.ok(DENSITY_BUCKETS[DENSITY_BUCKETS.length - 1].includes(lightChar));
});

test('getLuminance follows standard perceptual weights', () => {
  assert.equal(Math.round(getLuminance(0, 0, 0)), 0);
  assert.equal(Math.round(getLuminance(255, 255, 255)), 255);
  assert.ok(getLuminance(0, 255, 0) > getLuminance(255, 0, 0));
});

test('getInkColor produces legible royal violet tones across highlights and shadows', () => {
  assert.equal(getInkColor(252, 252, 252), 'rgb(184, 128, 224)');
  const darkInk = getInkColor(30, 40, 60);
  const match = darkInk.match(/^rgb\((\d+), (\d+), (\d+)\)$/);
  assert.ok(match);
  const [, r, g, b] = match.map(Number);
  assert.ok(b > r && r > g, 'dark ink remains royal violet');
});

test('stepLensState moves smoothly toward target and clamps large dt', () => {
  const start = { x: 0, y: 0, radius: 0 };
  const target = { x: 200, y: 120, radius: 64 };
  const step1 = stepLensState(start, target, 0.016);

  assert.ok(step1.x > 0 && step1.x < 200);
  assert.ok(step1.y > 0 && step1.y < 120);
  assert.ok(step1.radius > 0 && step1.radius < 64);

  // Large dt (e.g. tab switch) should still remain bounded
  const clamped = stepLensState(start, target, 5);
  assert.ok(clamped.x < 200);
  assert.ok(clamped.radius < 64);
});
