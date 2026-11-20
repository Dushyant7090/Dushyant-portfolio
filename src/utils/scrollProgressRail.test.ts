import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PORTFOLIO_SECTIONS,
  buildRailTicks,
  computePageScrollProgress,
  computeSectionRailStops,
  resolveActiveSectionIndex,
  stepRailProgress,
} from './scrollProgressRail';

test('PORTFOLIO_SECTIONS maps all 5 top-level portfolio sections in order', () => {
  assert.deepEqual(
    PORTFOLIO_SECTIONS.map((s) => s.id),
    ['top', 'about', 'toolkit', 'work', 'contact'],
  );
  assert.equal(PORTFOLIO_SECTIONS[0].number, '01');
  assert.equal(PORTFOLIO_SECTIONS[4].number, '05');
});

test('computePageScrollProgress normalizes scrollY accurately from 0 to 1', () => {
  assert.equal(computePageScrollProgress(0, 5000, 900), 0);
  assert.equal(computePageScrollProgress(2050, 5000, 900), 0.5);
  assert.equal(computePageScrollProgress(4100, 5000, 900), 1);
  assert.equal(computePageScrollProgress(9999, 5000, 900), 1);
  assert.equal(computePageScrollProgress(0, 800, 900), 0);
});

test('resolveActiveSectionIndex updates accurately in both scroll directions', () => {
  const tops = [0, 8100, 13680, 18540, 19800];
  const vh = 900;
  const totalH = 20700;

  assert.equal(resolveActiveSectionIndex(0, vh, totalH, tops), 0);
  assert.equal(resolveActiveSectionIndex(8000, vh, totalH, tops), 1); // anchor at 8315 >= 8100
  assert.equal(resolveActiveSectionIndex(13500, vh, totalH, tops), 2);
  assert.equal(resolveActiveSectionIndex(18400, vh, totalH, tops), 3);
  assert.equal(resolveActiveSectionIndex(19800, vh, totalH, tops), 4);
  // Scrolling back up into Toolkit
  assert.equal(resolveActiveSectionIndex(14000, vh, totalH, tops), 2);
});

test('computeSectionRailStops keeps ticks ordered and distinct along [0..1]', () => {
  const stops = computeSectionRailStops([0, 8100, 13680, 18540, 19800], 20700, 900);
  assert.equal(stops.length, 5);
  assert.equal(stops[0], 0);
  assert.equal(stops[4], 1);
  for (let i = 1; i < stops.length; i++) {
    assert.ok(stops[i] - stops[i - 1] >= 0.039);
  }
});

test('buildRailTicks places section ticks and subdivides long spans at regular intervals', () => {
  const ticks = buildRailTicks([0, 0.42, 0.7, 0.94, 1], 0.125);
  const sectionTicks = ticks.filter((t) => t.sectionIndex !== null);
  assert.equal(sectionTicks.length, 5);
  assert.ok(ticks.length > 5, 'adds regular intermediate ticks across tall sections');
  for (let i = 1; i < ticks.length; i++) {
    assert.ok(ticks[i].position > ticks[i - 1].position);
  }
});

test('stepRailProgress interpolates smoothly toward target without overshooting', () => {
  const forward = stepRailProgress(0.1, 0.5, 0.016);
  assert.ok(forward > 0.1 && forward < 0.5);

  const backward = stepRailProgress(0.8, 0.2, 0.016);
  assert.ok(backward < 0.8 && backward > 0.2);

  const settled = stepRailProgress(0.4999, 0.5, 0.016);
  assert.equal(settled, 0.5);
});
