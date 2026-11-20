import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampTargetScrollY,
  computeArrowScrollStepPx,
  resolveArrowScrollDirection,
} from './keyboardScroll';

test('resolveArrowScrollDirection handles ArrowDown and ArrowUp while ignoring inputs and modifiers', () => {
  assert.equal(resolveArrowScrollDirection({ key: 'ArrowDown' }), 1);
  assert.equal(resolveArrowScrollDirection({ key: 'ArrowUp' }), -1);
  assert.equal(resolveArrowScrollDirection({ key: 'ArrowLeft' }), null);
  assert.equal(resolveArrowScrollDirection({ key: 'ArrowDown', ctrlKey: true }), null);
  assert.equal(resolveArrowScrollDirection({ key: 'ArrowUp', metaKey: true }), null);
  assert.equal(resolveArrowScrollDirection({ key: 'ArrowDown', altKey: true }), null);
  assert.equal(resolveArrowScrollDirection({ key: 'ArrowDown', defaultPrevented: true }), null);
  assert.equal(resolveArrowScrollDirection({ key: 'ArrowDown', tagName: 'INPUT' }), null);
  assert.equal(resolveArrowScrollDirection({ key: 'ArrowUp', tagName: 'textarea' }), null);
  assert.equal(resolveArrowScrollDirection({ key: 'ArrowDown', isContentEditable: true }), null);
  assert.equal(resolveArrowScrollDirection({ key: 'ArrowDown', tagName: 'BUTTON' }), 1);
  assert.equal(resolveArrowScrollDirection({ key: 'ArrowUp', tagName: 'BODY' }), -1);
});

test('computeArrowScrollStepPx scales proportionally with viewport height and caps bounds', () => {
  const desktopTap = computeArrowScrollStepPx(900, false);
  const desktopRepeat = computeArrowScrollStepPx(900, true);
  assert.equal(desktopTap, 153);
  assert.equal(desktopRepeat, 126);

  const mobileTap = computeArrowScrollStepPx(844, false);
  assert.ok(mobileTap >= 120 && mobileTap <= 160);

  const shortTap = computeArrowScrollStepPx(400, false);
  assert.equal(shortTap, 96);

  const giantTap = computeArrowScrollStepPx(2200, false);
  assert.equal(giantTap, 220);
});

test('clampTargetScrollY clamps cleanly within [0, maxScrollY]', () => {
  assert.equal(clampTargetScrollY(-40, 2000), 0);
  assert.equal(clampTargetScrollY(500, 2000), 500);
  assert.equal(clampTargetScrollY(2600, 2000), 2000);
});
