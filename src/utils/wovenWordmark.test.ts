import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_WOVEN_PHYSICS,
  buildWovenWordmarkParticles,
  computeParticleWeaveState,
  getWovenWordmarkGridDimensions,
  sampleAlphaMaskToWovenParticles,
  stepWovenParticles,
} from './wovenWordmark';

test('buildWovenWordmarkParticles samples DUSHYANT into alternating horizontal and vertical dashes', () => {
  const dims = getWovenWordmarkGridDimensions('DUSHYANT');
  assert.equal(dims.rows, 11);
  assert.equal(dims.cols, 78);

  const { particles, cellSize } = buildWovenWordmarkParticles('DUSHYANT', 1200, 220);
  assert.ok(particles.length > 250);
  assert.ok(cellSize > 10);

  const hasH = particles.some((p) => p.orientation === 'h');
  const hasV = particles.some((p) => p.orientation === 'v');
  assert.equal(hasH, true);
  assert.equal(hasV, true);

  for (const p of particles) {
    assert.equal(p.orientation, (p.col + p.row) % 2 === 0 ? 'h' : 'v');
    assert.equal(p.x, p.homeX);
    assert.equal(p.y, p.homeY);
  }
});

test('sampleAlphaMaskToWovenParticles maps high-res font alpha masks and computes weave-in states', () => {
  const layout = sampleAlphaMaskToWovenParticles({
    cols: 20,
    rows: 10,
    canvasWidth: 800,
    canvasHeight: 200,
    threshold: 100,
    alphaAt: (c, r) => (c >= 2 && c < 18 && r >= 2 && r < 8 ? 220 : 20),
  });

  assert.equal(layout.particles.length, 16 * 6);
  assert.ok(layout.cellSize > 0);
  assert.equal(computeParticleWeaveState(0.2, 0).opacity, 0);
  assert.equal(computeParticleWeaveState(0.2, 1).opacity, 1);
  assert.equal(computeParticleWeaveState(0.2, 1).offsetY, 0);
  assert.ok(computeParticleWeaveState(0.2, 0.35).offsetY > 0);
});

test('stepWovenParticles pushes nearby dashes outward and bounces them back via Hooke spring physics', () => {
  const { particles } = buildWovenWordmarkParticles('DUSHYANT', 1200, 220);
  const target = particles[Math.floor(particles.length / 2)];
  const pointer = { x: target.homeX - 18, y: target.homeY + 10, active: true };

  for (let i = 0; i < 8; i++) {
    stepWovenParticles(particles, pointer, 0.016, DEFAULT_WOVEN_PHYSICS);
  }

  const displacedDist = Math.hypot(target.x - target.homeX, target.y - target.homeY);
  assert.ok(displacedDist > 4, `Expected dash to be pushed outward, got ${displacedDist}`);

  // Pointer moves away -> spring physics + damping return dashes cleanly home
  pointer.active = false;
  for (let i = 0; i < 120; i++) {
    stepWovenParticles(particles, pointer, 0.016, DEFAULT_WOVEN_PHYSICS);
  }

  const settledDist = Math.hypot(target.x - target.homeX, target.y - target.homeY);
  assert.ok(settledDist < 0.5, `Expected dash to snap back to home, got ${settledDist}`);
});
