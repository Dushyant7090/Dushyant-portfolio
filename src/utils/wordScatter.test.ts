import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EXIT_END_PROGRESS,
  EXIT_START_PROGRESS,
  INTRO_PARAGRAPH,
  LINE_REVEAL_START_PROGRESS,
  REASSEMBLY_SETTLE_PROGRESS,
  computeLineRevealSchedule,
  computeWordScatterOffsets,
  getIntroPhase,
  isParagraphReassembled,
} from './wordScatter';

test('INTRO_PARAGRAPH matches exact biographical text', () => {
  assert.equal(
    INTRO_PARAGRAPH,
    "Hello! I'm Dushyant Beniwal, an MCA student specializing in Data Analytics at PES University. With a foundation in computer science from my BCA at JSS SMI, Dharwad, I've developed a strong interest in understanding data, uncovering meaningful patterns, and building practical, user-focused solutions. Alongside my academic journey, I'm exploring the world of open-source development through my contributions to omegaUp, continuously learning, experimenting, and growing as a software developer."
  );
});

test('computeWordScatterOffsets returns subtle, irregular horizontal offsets scaled per viewport', () => {
  const desktop = computeWordScatterOffsets(40, 1440);
  const tablet = computeWordScatterOffsets(40, 768);
  const mobile = computeWordScatterOffsets(40, 390);

  assert.equal(desktop.length, 40);
  assert.equal(tablet.length, 40);
  assert.equal(mobile.length, 40);

  // Deterministic across calls
  assert.deepEqual(desktop, computeWordScatterOffsets(40, 1440));

  // Balanced positive & negative horizontal scatter within subtle non-colliding bounds
  const pos = desktop.filter((d) => d.x > 0).length;
  const neg = desktop.filter((d) => d.x < 0).length;
  assert.ok(pos > 10 && neg > 10);
  assert.ok(desktop[0].x > 0);
  assert.ok(mobile[0].x > 0);

  for (let i = 0; i < desktop.length; i++) {
    const d = desktop[i];
    assert.ok(Math.abs(d.x) >= 1 && Math.abs(d.x) <= 28);
    assert.ok(d.initialOpacity >= 0.46 && d.initialOpacity <= 0.74);
    if (i > 0) {
      assert.ok(desktop[i - 1].x - d.x <= 4);
    }
  }
  for (let i = 0; i < tablet.length; i++) {
    assert.ok(Math.abs(tablet[i].x) >= 1 && Math.abs(tablet[i].x) <= 20);
    if (i > 0) {
      assert.ok(tablet[i - 1].x - tablet[i].x <= 3);
    }
  }
  for (let i = 0; i < mobile.length; i++) {
    assert.ok(Math.abs(mobile[i].x) >= 1 && Math.abs(mobile[i].x) <= 12);
    if (i > 0) {
      assert.ok(mobile[i - 1].x - mobile[i].x <= 2);
    }
  }
});

test('computeLineRevealSchedule reveals top-to-bottom and disappears top-to-bottom sequentially', () => {
  assert.deepEqual(computeLineRevealSchedule(0), []);

  const schedule = computeLineRevealSchedule(8);
  assert.equal(schedule.length, 8);
  assert.equal(schedule[0].initiallyVisible, true);
  assert.equal(schedule[0].enterStart, 0);
  assert.equal(schedule[1].enterStart, LINE_REVEAL_START_PROGRESS);

  // Entrance: top-to-bottom one by one
  for (let i = 1; i < schedule.length; i++) {
    assert.equal(schedule[i].initiallyVisible, false);
    assert.ok(schedule[i].enterStart >= LINE_REVEAL_START_PROGRESS);
    assert.ok(schedule[i].enterStart < schedule[i].enterEnd);
    assert.ok(schedule[i].wordStart < schedule[i].wordEnd);
    assert.ok(schedule[i].wordEnd <= REASSEMBLY_SETTLE_PROGRESS);
    if (i > 1) {
      assert.ok(schedule[i - 1].enterEnd <= schedule[i].enterStart);
    }
  }

  // Exit: starts from top line (index 0) and moves downward one by one to line N-1
  assert.equal(schedule[0].exitStart, EXIT_START_PROGRESS);
  for (let i = 0; i < schedule.length; i++) {
    assert.ok(schedule[i].exitStart >= EXIT_START_PROGRESS);
    assert.ok(schedule[i].exitStart < schedule[i].exitEnd);
    assert.ok(schedule[i].exitEnd <= EXIT_END_PROGRESS);
    if (i > 0) {
      // Upper line (i - 1) finishes disappearing before line below (i) begins disappearing
      assert.ok(schedule[i - 1].exitEnd <= schedule[i].exitStart);
    }
  }
});

test('getIntroPhase and isParagraphReassembled track entering, assembled hold, exiting, and exited', () => {
  assert.equal(getIntroPhase(0), 'entering');
  assert.equal(getIntroPhase(0.25), 'entering');
  assert.equal(getIntroPhase(REASSEMBLY_SETTLE_PROGRESS), 'assembled');
  assert.equal(getIntroPhase(0.5), 'assembled');
  assert.equal(getIntroPhase(EXIT_START_PROGRESS), 'exiting');
  assert.equal(getIntroPhase(0.75), 'exiting');
  assert.equal(getIntroPhase(EXIT_END_PROGRESS), 'exited');
  assert.equal(getIntroPhase(1), 'exited');

  assert.equal(isParagraphReassembled(0), false);
  assert.equal(isParagraphReassembled(REASSEMBLY_SETTLE_PROGRESS), true);
  assert.equal(isParagraphReassembled(0.5), true);
  assert.equal(isParagraphReassembled(EXIT_START_PROGRESS), false);
  assert.equal(isParagraphReassembled(1), false);
});
