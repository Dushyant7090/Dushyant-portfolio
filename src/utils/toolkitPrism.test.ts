import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DESKTOP_PRISM_DIMENSIONS,
  MOBILE_PRISM_DIMENSIONS,
  PRISM_ENTER_END,
  PRISM_PRESENT_END,
  PRISM_TURN_END,
  LEFT_HEADING_REVEAL_END,
  LEFT_HEADING_FADEOUT_START,
  computeResponsiveCameraFraming,
  computeToolkitLeftHeadingLayout,
  computeToolkitLeftHeadingPose,
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

test('computeToolkitLeftHeadingLayout aligns heading on TOOLKIT row at exact 1:1 scale without overlap', () => {
  const wide = computeResponsiveCameraFraming({
    viewportWidth: 1917,
    viewportHeight: 850,
    navbarHeightPx: 84,
  });
  const wideLayout = computeToolkitLeftHeadingLayout({
    viewportWidth: 1917,
    viewportHeight: 850,
    framing: wide,
  });
  assert.equal(wideLayout.visible, true);
  assert.equal(wideLayout.linesMode, '2-lines');
  assert.ok(wideLayout.wordmarkHeightPx >= 32 && wideLayout.wordmarkHeightPx <= 36);
  assert.ok(wideLayout.wordmarkTopPx >= 185 && wideLayout.wordmarkTopPx <= 205);
  assert.ok(wideLayout.leftPx + wideLayout.widthPx + wideLayout.gapPx <= wideLayout.prismLeftPx + 1);

  const laptopWide = computeResponsiveCameraFraming({
    viewportWidth: 1536,
    viewportHeight: 720,
    navbarHeightPx: 84,
  });
  const laptopLayout = computeToolkitLeftHeadingLayout({
    viewportWidth: 1536,
    viewportHeight: 720,
    framing: laptopWide,
  });
  assert.equal(laptopLayout.visible, true);
  assert.equal(laptopLayout.linesMode, '3-lines');
  assert.ok(laptopLayout.leftPx + laptopLayout.widthPx + laptopLayout.gapPx <= laptopLayout.prismLeftPx + 1);

  const hd1080 = computeResponsiveCameraFraming({
    viewportWidth: 1920,
    viewportHeight: 1080,
    navbarHeightPx: 84,
  });
  const hdLayout = computeToolkitLeftHeadingLayout({
    viewportWidth: 1920,
    viewportHeight: 1080,
    framing: hd1080,
  });
  assert.equal(hdLayout.visible, false);

  const cramped1440 = computeResponsiveCameraFraming({
    viewportWidth: 1440,
    viewportHeight: 900,
    navbarHeightPx: 84,
  });
  const crampedLayout = computeToolkitLeftHeadingLayout({
    viewportWidth: 1440,
    viewportHeight: 900,
    framing: cramped1440,
  });
  assert.equal(crampedLayout.visible, false);
  assert.equal(crampedLayout.placement, 'hidden');

  const mobile = computeResponsiveCameraFraming({
    viewportWidth: 390,
    viewportHeight: 844,
    navbarHeightPx: 66,
  });
  const mobileLayout = computeToolkitLeftHeadingLayout({
    viewportWidth: 390,
    viewportHeight: 844,
    framing: mobile,
    navbarBottomPx: 66,
  });
  assert.equal(mobileLayout.visible, true);
  assert.equal(mobileLayout.placement, 'above-prism');
  assert.equal(mobileLayout.linesMode, '1-line');
  assert.equal(mobileLayout.wordmarkHeightPx, 11);
  assert.ok(mobileLayout.wordmarkTopPx > 66 + 8);
  assert.ok(mobileLayout.leftPx + mobileLayout.widthPx <= 390 - 12);

  const tabletPortrait = computeResponsiveCameraFraming({
    viewportWidth: 768,
    viewportHeight: 1024,
    navbarHeightPx: 84,
  });
  const tabletPortraitLayout = computeToolkitLeftHeadingLayout({
    viewportWidth: 768,
    viewportHeight: 1024,
    framing: tabletPortrait,
    navbarBottomPx: 84,
  });
  assert.equal(tabletPortraitLayout.visible, true);
  assert.equal(tabletPortraitLayout.placement, 'above-prism');
  assert.equal(tabletPortraitLayout.linesMode, '1-line');
  assert.equal(tabletPortraitLayout.wordmarkHeightPx, 15);
  assert.ok(tabletPortraitLayout.wordmarkTopPx > 84 + 8);

  const tabletLandscape = computeResponsiveCameraFraming({
    viewportWidth: 1024,
    viewportHeight: 768,
    navbarHeightPx: 84,
  });
  const tabletLandscapeLayout = computeToolkitLeftHeadingLayout({
    viewportWidth: 1024,
    viewportHeight: 768,
    framing: tabletLandscape,
    navbarBottomPx: 84,
  });
  assert.equal(tabletLandscapeLayout.visible, true);
  assert.equal(tabletLandscapeLayout.placement, 'above-prism');
  assert.equal(tabletLandscapeLayout.linesMode, '1-line');
  assert.equal(tabletLandscapeLayout.wordmarkHeightPx, 16);
  assert.ok(tabletLandscapeLayout.wordmarkTopPx > 84 + 8);
});

test('computeToolkitLeftHeadingPose is strictly hidden outside front presentation and reversible across scroll', () => {
  for (const p of [0, 0.1, 0.24, 0.38, PRISM_TURN_END, PRISM_PRESENT_END, 0.78, 0.9, 1]) {
    const pose = computeToolkitLeftHeadingPose(p);
    assert.equal(pose.opacity, 0, `Expected opacity 0 at progress ${p}`);
    assert.equal(pose.visible, false, `Expected visible false at progress ${p}`);
  }

  const entering = computeToolkitLeftHeadingPose((PRISM_TURN_END + LEFT_HEADING_REVEAL_END) / 2);
  assert.equal(entering.visible, true);
  assert.ok(entering.opacity > 0.3 && entering.opacity < 0.7);
  assert.ok(entering.translateY > 0);
  assert.ok(entering.translateX < 0);

  const settled = computeToolkitLeftHeadingPose(0.62);
  assert.equal(settled.visible, true);
  assert.equal(settled.opacity, 1);
  assert.equal(settled.translateX, 0);
  assert.equal(settled.translateY, 0);

  const fadingOut = computeToolkitLeftHeadingPose((LEFT_HEADING_FADEOUT_START + PRISM_PRESENT_END) / 2);
  assert.equal(fadingOut.visible, true);
  assert.ok(fadingOut.opacity > 0.3 && fadingOut.opacity < 0.7);
  assert.ok(fadingOut.translateY < 0);
});
