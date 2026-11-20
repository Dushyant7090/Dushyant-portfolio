import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DESKTOP_PRISM_DIMENSIONS,
  MOBILE_PRISM_DIMENSIONS,
  PRISM_ENTER_END,
  PRISM_PRESENT_END,
  PRISM_TURN_END,
  computeResponsiveCameraFraming,
  computeToolkitPrismPose,
} from './toolkitPrism';

test('computeResponsiveCameraFraming fills 90-95% of available viewport below navbar without clipping', () => {
  const desktop = computeResponsiveCameraFraming({
    viewportWidth: 1440,
    viewportHeight: 900,
    navbarHeightPx: 84,
  });

  assert.equal(desktop.isMobile, false);
  assert.deepEqual(desktop.dimensions, DESKTOP_PRISM_DIMENSIONS);
  assert.ok(desktop.dimensions.radius >= 0.3);
  assert.ok(desktop.cameraZ >= 9 && desktop.cameraZ <= 12);
  assert.ok(desktop.restingY < 0);

  const halfFovTan = Math.tan((desktop.fovDeg * Math.PI) / 360);
  const frontVisH = 2 * (desktop.cameraZ - desktop.dimensions.depth / 2) * halfFovTan;
  const availablePx = 900 - 84;
  const prismHeightPx = (desktop.dimensions.height / frontVisH) * 900;
  const fillRatio = prismHeightPx / availablePx;
  assert.ok(fillRatio >= 0.88 && fillRatio <= 0.96, `Expected fillRatio 0.88-0.96, got ${fillRatio}`);

  const prismTopY = desktop.restingY + desktop.dimensions.height / 2;
  const screenTopGapRatio = (frontVisH / 2 - prismTopY) / frontVisH;
  assert.ok(screenTopGapRatio > 84 / 900);

  const mobile = computeResponsiveCameraFraming({
    viewportWidth: 390,
    viewportHeight: 844,
    navbarHeightPx: 66,
  });
  assert.equal(mobile.isMobile, true);
  assert.deepEqual(mobile.dimensions, MOBILE_PRISM_DIMENSIONS);
  assert.ok(mobile.restingY < 0);

  const portraitTablet = computeResponsiveCameraFraming({
    viewportWidth: 768,
    viewportHeight: 1024,
    navbarHeightPx: 84,
  });
  assert.equal(portraitTablet.isMobile, true);
  assert.deepEqual(portraitTablet.dimensions, MOBILE_PRISM_DIMENSIONS);

  const landscapeTablet = computeResponsiveCameraFraming({
    viewportWidth: 1024,
    viewportHeight: 768,
    navbarHeightPx: 84,
  });
  assert.equal(landscapeTablet.isMobile, false);
  assert.deepEqual(landscapeTablet.dimensions, DESKTOP_PRISM_DIMENSIONS);
});

test('computeToolkitPrismPose rotates continuously through backside with zero pause before front presentation', () => {
  const start = computeToolkitPrismPose(0);
  assert.equal(start.stage, 'entrance');
  assert.ok(start.translateY < -4);
  assert.ok(start.scale < 0.4);
  assert.ok(Math.abs(start.rotateYDeg + 102) < 5);

  // Check angular velocity never stalls around back view (-170° .. -195°)
  const samples = [0.15, 0.18, 0.21, 0.24, 0.27].map((p) => computeToolkitPrismPose(p));
  for (let i = 1; i < samples.length; i++) {
    const stepDeg = Math.abs(samples[i].rotateYDeg - samples[i - 1].rotateYDeg);
    assert.ok(stepDeg >= 12, `Expected continuous angular speed >= 12 deg/0.03p near back view, got ${stepDeg}`);
  }

  const backView = computeToolkitPrismPose(0.195);
  assert.equal(backView.activeSide, 'back');
  assert.ok(backView.backFaceOpacity > 0.9);
  assert.equal(backView.frontFaceOpacity, 0);

  const midTurn = computeToolkitPrismPose(PRISM_ENTER_END + 0.04);
  assert.equal(midTurn.stage, 'rotation');
  assert.ok(midTurn.zOffset < -1.2);
  assert.ok(midTurn.scale > backView.scale && midTurn.scale < 1);

  const present = computeToolkitPrismPose((PRISM_TURN_END + PRISM_PRESENT_END) / 2);
  assert.equal(present.stage, 'presentation');
  assert.equal(present.activeSide, 'front');
  assert.equal(present.rotateYDeg, -360);
  assert.equal(present.rotateXDeg, 0);
  assert.equal(present.translateY, 0);
  assert.equal(present.zOffset, 0);
  assert.equal(present.scale, 1);
  assert.equal(present.frontFaceOpacity, 1);
  assert.equal(present.backFaceOpacity, 0);

  const midExit = computeToolkitPrismPose(PRISM_PRESENT_END + (1 - PRISM_PRESENT_END) * 0.55);
  assert.equal(midExit.stage, 'exit');
  assert.ok(midExit.scale > 0.5 && midExit.scale < 0.9);
  assert.ok(midExit.translateY > 2);
  assert.equal(midExit.opacity, 1);

  const exitEnd = computeToolkitPrismPose(1);
  assert.equal(exitEnd.stage, 'exit');
  assert.ok(exitEnd.rotateYDeg < -450);
  assert.ok(exitEnd.scale < 0.5);
  assert.ok(exitEnd.translateY > 5);
  assert.equal(exitEnd.opacity, 0);
});
