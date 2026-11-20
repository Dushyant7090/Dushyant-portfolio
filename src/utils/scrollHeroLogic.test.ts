import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INTRO_REVEAL_THRESHOLD,
  PHRASE_WINDOWS,
  PORTRAIT_SETTLE_PROGRESS,
  computeCenterOffset,
  computeEndHeroScale,
  computeEndOffset,
  computeInitialHeroScale,
  computeProgressiveStages,
  getPhraseIndexForProgress,
  getProgressForPhraseIndex,
  isIntroRevealed,
} from './scrollHeroLogic';

test('computeCenterOffset places resting element dead-center in viewport', () => {
  const offset = computeCenterOffset(
    { left: 820, top: 180, width: 500, height: 520 },
    { width: 1440, height: 900, topReserve: 96 }
  );
  assert.equal(offset.x, -350);
  assert.equal(offset.y, 58);
});

test('computeInitialHeroScale computes dominating initial scale that fits viewport bounds', () => {
  const desktopScale = computeInitialHeroScale(
    { width: 516, height: 530 },
    { width: 1440, height: 900, topReserve: 96, bottomReserve: 44 }
  );
  assert.ok(desktopScale >= 1.25 && desktopScale <= 1.38);
  assert.ok(530 * desktopScale <= 900 - 96 - 44);

  const mobileScale = computeInitialHeroScale(
    { width: 296, height: 304 },
    { width: 390, height: 844, topReserve: 76, bottomReserve: 44 }
  );
  assert.ok(mobileScale >= 1.15 && mobileScale <= 1.24);
  assert.ok(296 * mobileScale <= 390 * 0.92);
});

test('computeEndHeroScale and computeEndOffset shrink portrait cleanly while keeping desktop right-aligned', () => {
  const desktopEnd = computeEndHeroScale(1440);
  const mobileEnd = computeEndHeroScale(390);
  assert.equal(desktopEnd, 0.74);
  assert.equal(mobileEnd, 0.8);

  const desktopOffset = computeEndOffset(500, desktopEnd, true);
  assert.equal(desktopOffset.x, 65);
  assert.equal(desktopOffset.y, 0);

  const mobileOffset = computeEndOffset(296, mobileEnd, false);
  assert.equal(mobileOffset.x, 0);
  assert.equal(mobileOffset.y, 0);
});

test('computeProgressiveStages steps monotonically from enlarged center to compact right', () => {
  const endOffset = computeEndOffset(500, 0.74, true);
  const stages = computeProgressiveStages(
    { x: -350, y: 20 },
    1.32,
    0.74,
    endOffset
  );
  assert.equal(stages.start.scale, 1.32);
  assert.ok(
    stages.stage1.scale < stages.start.scale &&
      stages.stage1.scale > stages.stage2.scale
  );
  assert.ok(
    stages.stage2.scale < stages.stage1.scale &&
      stages.stage2.scale > stages.end.scale
  );
  assert.equal(stages.end.scale, 0.74);
  assert.equal(stages.end.x, 65);
  assert.equal(stages.end.y, 0);
});

test('PHRASE_WINDOWS are ordered, non-overlapping, and allocate generous enter spans', () => {
  assert.equal(PHRASE_WINDOWS.length, 5);
  for (let i = 0; i < PHRASE_WINDOWS.length; i++) {
    const w = PHRASE_WINDOWS[i];
    assert.ok(w.enterEnd - w.enterStart >= 0.075);
    assert.ok(w.holdMid >= w.enterEnd && w.holdMid <= 1);
    if (w.exitStart !== null && w.exitEnd !== null) {
      assert.ok(w.exitStart > w.enterEnd);
      assert.ok(w.exitEnd > w.exitStart);
      if (i < PHRASE_WINDOWS.length - 1) {
        assert.ok(w.exitEnd <= PHRASE_WINDOWS[i + 1].enterStart);
      }
    }
  }
});

test('isIntroRevealed stays false until portrait finishes settling on the right', () => {
  assert.equal(isIntroRevealed(0), false);
  assert.equal(isIntroRevealed(0.14), false);
  assert.equal(isIntroRevealed(PORTRAIT_SETTLE_PROGRESS - 0.01), false);
  assert.equal(isIntroRevealed(INTRO_REVEAL_THRESHOLD), true);
  assert.equal(isIntroRevealed(0.65), true);
});

test('getPhraseIndexForProgress maps normalized scroll progress cleanly across all 5 phrases', () => {
  assert.equal(getPhraseIndexForProgress(0.0), 0);
  assert.equal(getPhraseIndexForProgress(0.32), 0);
  assert.equal(getPhraseIndexForProgress(0.48), 1);
  assert.equal(getPhraseIndexForProgress(0.64), 2);
  assert.equal(getPhraseIndexForProgress(0.8), 3);
  assert.equal(getPhraseIndexForProgress(0.95), 4);
  assert.equal(getPhraseIndexForProgress(1.0), 4);
});

test('getProgressForPhraseIndex round-trips back to the same phrase index', () => {
  for (let i = 0; i < 5; i++) {
    const p = getProgressForPhraseIndex(i);
    assert.equal(getPhraseIndexForProgress(p), i);
  }
});
