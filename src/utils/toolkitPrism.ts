export const PRISM_ENTER_END = 0.24;
export const PRISM_TURN_END = 0.52;
export const PRISM_PRESENT_END = 0.74;

export interface PrismDimensions {
  width: number;
  height: number;
  depth: number;
  radius: number;
}

export const DESKTOP_PRISM_DIMENSIONS: PrismDimensions = {
  width: 9.2,
  height: 5.4,
  depth: 1.2,
  radius: 0.36,
};

export const MOBILE_PRISM_DIMENSIONS: PrismDimensions = {
  width: 4.6,
  height: 7.4,
  depth: 0.85,
  radius: 0.26,
};

export interface CameraFraming {
  cameraZ: number;
  fovDeg: number;
  restingY: number;
  isMobile: boolean;
  dimensions: PrismDimensions;
  htmlDistanceFactor: number;
}

export type ToolkitPrismStage =
  | 'entrance'
  | 'rotation'
  | 'presentation'
  | 'exit';

export interface ToolkitPrismPose {
  stage: ToolkitPrismStage;
  rotateYDeg: number;
  rotateYRad: number;
  rotateXDeg: number;
  rotateXRad: number;
  translateY: number;
  zOffset: number;
  scale: number;
  opacity: number;
  frontFaceOpacity: number;
  backFaceOpacity: number;
  activeSide: 'front' | 'back' | 'edge';
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutSine(t: number): number {
  return 0.5 * (1 - Math.cos(Math.PI * t));
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Computes responsive PerspectiveCamera distance and vertical prism offset
 * so at maximum presentation (scale = 1) the front face occupies ~90–95% of
 * the available viewport below the fixed navbar without stretching or clipping.
 */
export function computeResponsiveCameraFraming(params: {
  viewportWidth: number;
  viewportHeight: number;
  navbarHeightPx?: number;
}): CameraFraming {
  const safeW = Math.max(320, params.viewportWidth);
  const safeH = Math.max(420, params.viewportHeight);
  const aspect = safeW / safeH;
  const isPortraitViewport = safeW < 768 || (safeW <= 1024 && safeH > safeW * 1.08);
  const isMobile = isPortraitViewport;
  const dimensions = isMobile ? MOBILE_PRISM_DIMENSIONS : DESKTOP_PRISM_DIMENSIONS;
  const fovDeg = 38;
  const halfFovTan = Math.tan((fovDeg * Math.PI) / 360);

  const navbarPx = params.navbarHeightPx ?? (safeW < 640 ? 66 : 84);
  const clearanceMarginPx = safeW < 640 ? 10 : 14;
  const topClearPx = navbarPx + clearanceMarginPx;
  const availableHeightRatio = Math.max(0.65, (safeH - topClearPx) / safeH);

  // Target ~92–94% of the available height below navbar and ~93% of viewport width
  const targetAvailableVertFill = isMobile ? 0.9 : 0.93;
  const targetHorizFill = isMobile ? 0.92 : 0.93;

  const frontDistH =
    dimensions.height /
    (availableHeightRatio * targetAvailableVertFill) /
    (2 * halfFovTan);
  const frontDistW =
    dimensions.width / targetHorizFill / (2 * halfFovTan * aspect);
  const cameraZ = round3(Math.max(frontDistH, frontDistW) + dimensions.depth / 2);

  const frontPlaneDist = cameraZ - dimensions.depth / 2;
  const frontVisH = 2 * frontPlaneDist * halfFovTan;
  const safeCenterOffsetRatio = 0.5 * (topClearPx / safeH);
  const restingY = round3(-safeCenterOffsetRatio * frontVisH);

  return {
    cameraZ,
    fovDeg,
    restingY,
    isMobile,
    dimensions,
    htmlDistanceFactor: isMobile ? 4.8 : 3.65,
  };
}

/**
 * Pure 4-stage scroll-progress solver for the 3D colourless glass prism:
 * - 0.00 -> 0.52: One continuous, uninterrupted rise, scale-up, and Y-axis rotation
 *   from narrow entry (-102°) straight through the mirrored backside (-180°) to front (-360°),
 *   with zero pause or stall on the back view.
 * - 0.52 -> 0.74: Full-size presentation below the fixed navbar.
 * - 0.74 -> 1.00: Progressive shrink + continued rotation + upward glide behind frosted navbar.
 */
export function computeToolkitPrismPose(
  rawProgress: number,
  options?: { isMobile?: boolean },
): ToolkitPrismPose {
  const p = clamp01(rawProgress);
  const isMobile = Boolean(options?.isMobile);

  let stage: ToolkitPrismStage;
  let rotateYDeg: number;
  let rotateXDeg: number;
  let translateY: number;
  let zOffset: number;
  let scale: number;
  let opacity: number;

  if (p < PRISM_TURN_END) {
    stage = p < PRISM_ENTER_END ? 'entrance' : 'rotation';
    const tTurn = p / PRISM_TURN_END;
    const continuousRot = 0.25 * tTurn + 0.75 * easeInOutSine(tTurn);
    const easedLift = easeOutCubic(tTurn);
    const easedScale = easeInOutSine(tTurn);
    const turnSin = Math.sin(Math.PI * tTurn);

    rotateYDeg = lerp(isMobile ? -110 : -102, -360, continuousRot);
    rotateXDeg = lerp(6.5, 0, easedLift);
    translateY = lerp(isMobile ? -4.4 : -4.8, 0, easedLift);
    zOffset = lerp(-1.2, 0, easedLift) - (isMobile ? 0.9 : 1.35) * turnSin;
    scale = lerp(isMobile ? 0.42 : 0.34, 1, easedScale);
    opacity = smoothstep(0, 0.08, tTurn);
  } else if (p <= PRISM_PRESENT_END) {
    stage = 'presentation';
    rotateYDeg = -360;
    rotateXDeg = 0;
    translateY = 0;
    zOffset = 0;
    scale = 1;
    opacity = 1;
  } else {
    stage = 'exit';
    const local = (p - PRISM_PRESENT_END) / (1 - PRISM_PRESENT_END);
    const easedMove = easeInOutCubic(local);
    rotateYDeg = lerp(-360, isMobile ? -444 : -468, easedMove);
    rotateXDeg = lerp(0, -6.0, easedMove);
    translateY = lerp(0, isMobile ? 6.8 : 5.9, easedMove);
    zOffset = lerp(0, -1.1, easedMove);
    scale = lerp(1, isMobile ? 0.5 : 0.46, easedMove);
    opacity = 1 - smoothstep(0.76, 1.0, local);
  }

  const rotateYRad = (rotateYDeg * Math.PI) / 180;
  const rotateXRad = (rotateXDeg * Math.PI) / 180;
  const cosY = Math.cos(rotateYRad);

  const frontFaceOpacity = round3(smoothstep(0.08, 0.28, cosY) * opacity);
  const backFaceOpacity = round3(smoothstep(-0.08, -0.28, cosY) * opacity);

  let activeSide: 'front' | 'back' | 'edge' = 'edge';
  if (cosY >= 0.18) activeSide = 'front';
  else if (cosY <= -0.18) activeSide = 'back';

  return {
    stage,
    rotateYDeg: round3(rotateYDeg),
    rotateYRad: round3(rotateYRad),
    rotateXDeg: round3(rotateXDeg),
    rotateXRad: round3(rotateXRad),
    translateY: round3(translateY),
    zOffset: round3(zOffset),
    scale: round3(scale),
    opacity: round3(opacity),
    frontFaceOpacity,
    backFaceOpacity,
    activeSide,
  };
}

export type ToolkitLeftHeadingLinesMode = '1-line' | '2-lines' | '3-lines';
export type ToolkitLeftHeadingPlacement = 'left-beside' | 'above-prism' | 'hidden';

export interface ToolkitLeftHeadingLayout {
  visible: boolean;
  placement: ToolkitLeftHeadingPlacement;
  leftPx: number;
  wordmarkTopPx: number;
  wordmarkHeightPx: number;
  lineGapPx: number;
  linesMode: ToolkitLeftHeadingLinesMode;
  widthPx: number;
  prismLeftPx: number;
  gapPx: number;
}

export interface ToolkitLeftHeadingPose {
  visible: boolean;
  opacity: number;
  translateX: number;
  translateY: number;
}

export const LEFT_HEADING_REVEAL_END = 0.555;
export const LEFT_HEADING_FADEOUT_START = 0.705;

// Exact geometric viewBox widths (in 48-unit cap-height space) matching ToolkitWordmarkSvg
export const LEFT_HEADING_ONE_LINE_VIEWBOX_W = 706;
export const LEFT_HEADING_TWO_LINE_VIEWBOX_W = 420;
export const LEFT_HEADING_THREE_LINE_VIEWBOX_W = 270;

function computeMobileAndTabletWordmarkHeightPx(viewportWidth: number): number {
  if (viewportWidth < 640) return 11;
  if (viewportWidth < 768) return 13;
  if (viewportWidth < 1024) return 15;
  return 16;
}

/**
 * Computes exact screen-space placement for "THE THINGS I KNOW":
 * - Desktop (> 1024px landscape): left-side beside the settled prism on the TOOLKIT row (1:1 scale).
 * - Mobile & Tablet (portrait or <= 1024px): single-line heading directly above the 3D Toolkit prism,
 *   sized to match "DUSHYANT BENIWAL" in the navbar and aligned with the Toolkit wordmark column.
 */
export function computeToolkitLeftHeadingLayout(params: {
  viewportWidth: number;
  viewportHeight: number;
  framing: CameraFraming;
  navbarBottomPx?: number;
}): ToolkitLeftHeadingLayout {
  const safeW = Math.max(320, params.viewportWidth);
  const safeH = Math.max(420, params.viewportHeight);
  const { framing } = params;

  const frontPlaneDist = framing.cameraZ - framing.dimensions.depth / 2;
  const halfFovTan = Math.tan((framing.fovDeg * Math.PI) / 360);
  const frontVisH = 2 * frontPlaneDist * halfFovTan;
  const frontVisW = frontVisH * (safeW / safeH);

  const prismWidthPx = (framing.dimensions.width / frontVisW) * safeW;
  const prismHeightPx = (framing.dimensions.height / frontVisH) * safeH;
  const prismLeftPx = round3((safeW - prismWidthPx) / 2);
  const prismCenterYPx = safeH * (0.5 - framing.restingY / frontVisH);
  const prismTopPx = prismCenterYPx - prismHeightPx / 2;

  // Exact Three.js + drei <Html transform> screen projection of ToolkitFaceBoard's TOOLKIT SVG
  const embeddedOffsetZ = framing.dimensions.depth * 0.14;
  const boardPlaneDist = framing.cameraZ - embeddedOffsetZ;
  const boardVisH = 2 * boardPlaneDist * halfFovTan;
  const boardScale = (safeH / boardVisH) * (framing.htmlDistanceFactor / 400);
  const boardLogicalW = framing.isMobile ? 356 : 960;
  const boardLogicalH = framing.isMobile ? 592 : 548;
  const boardPadX = framing.isMobile ? 16 : 36;
  const boardPadTop = framing.isMobile ? 16 : 28;
  const boardWidthPx = boardLogicalW * boardScale;
  const boardHeightPx = boardLogicalH * boardScale;
  const boardCenterYPx = safeH * (0.5 - framing.restingY / boardVisH);
  const boardTopPx = boardCenterYPx - boardHeightPx / 2;
  const boardLeftPx = (safeW - boardWidthPx) / 2;

  // Mobile and Tablet placement: directly above the 3D Toolkit prism without overlapping navbar or prism
  if (framing.isMobile || safeW <= 1024) {
    const navbarBottomPx = params.navbarBottomPx ?? (safeW < 640 ? 66 : 84);
    const heightPx = computeMobileAndTabletWordmarkHeightPx(safeW);
    const widthPx = Math.ceil(LEFT_HEADING_ONE_LINE_VIEWBOX_W * (heightPx / 48));
    const availableGap = prismTopPx - navbarBottomPx;

    if (availableGap < heightPx + 14) {
      return {
        visible: false,
        placement: 'hidden',
        leftPx: 0,
        wordmarkTopPx: navbarBottomPx + 8,
        wordmarkHeightPx: heightPx,
        lineGapPx: 0,
        linesMode: '1-line',
        widthPx: 0,
        prismLeftPx,
        gapPx: 0,
      };
    }

    const bottomMargin = Math.min(24, Math.max(8, Math.round(availableGap * 0.28)));
    const topPx = round3(
      Math.max(navbarBottomPx + 8, prismTopPx - bottomMargin - heightPx),
    );
    const alignedLeftPx = round3(boardLeftPx + boardPadX * boardScale);
    const maxSafeLeft = Math.max(12, safeW - widthPx - 12);
    const clampedLeftPx = round3(Math.min(Math.max(12, alignedLeftPx), maxSafeLeft));

    return {
      visible: true,
      placement: 'above-prism',
      leftPx: clampedLeftPx,
      wordmarkTopPx: topPx,
      wordmarkHeightPx: heightPx,
      lineGapPx: 0,
      linesMode: '1-line',
      widthPx,
      prismLeftPx,
      gapPx: bottomMargin,
    };
  }

  const wordmarkTopPx = round3(boardTopPx + boardPadTop * boardScale);
  const wordmarkHeightPx = round3(30 * boardScale);
  const lineGapPx = Math.max(8, Math.round(wordmarkHeightPx * 0.34));

  const outerPadPx = Math.round(Math.min(40, Math.max(22, prismLeftPx * 0.085)));
  const gapPx = Math.round(Math.min(36, Math.max(20, prismLeftPx * 0.085)));
  const maxSlotWidthPx = prismLeftPx - outerPadPx - gapPx;

  const scaleFromCap = wordmarkHeightPx / 48;
  const twoLineWidthPx = Math.ceil(LEFT_HEADING_TWO_LINE_VIEWBOX_W * scaleFromCap);
  const threeLineWidthPx = Math.ceil(LEFT_HEADING_THREE_LINE_VIEWBOX_W * scaleFromCap);

  if (twoLineWidthPx <= maxSlotWidthPx) {
    return {
      visible: true,
      placement: 'left-beside',
      leftPx: outerPadPx,
      wordmarkTopPx,
      wordmarkHeightPx,
      lineGapPx,
      linesMode: '2-lines',
      widthPx: twoLineWidthPx,
      prismLeftPx,
      gapPx,
    };
  }

  if (threeLineWidthPx <= maxSlotWidthPx) {
    return {
      visible: true,
      placement: 'left-beside',
      leftPx: outerPadPx,
      wordmarkTopPx,
      wordmarkHeightPx,
      lineGapPx,
      linesMode: '3-lines',
      widthPx: threeLineWidthPx,
      prismLeftPx,
      gapPx,
    };
  }

  return {
    visible: false,
    placement: 'hidden',
    leftPx: outerPadPx,
    wordmarkTopPx,
    wordmarkHeightPx,
    lineGapPx,
    linesMode: '3-lines',
    widthPx: 0,
    prismLeftPx,
    gapPx,
  };
}

/**
 * Computes reversible scroll-synchronized visibility for "THE THINGS I KNOW".
 * Strictly hidden (opacity = 0) during entrance, rotation, and exit stages,
 * revealing with a subtle slide + fade exclusively inside the front-facing presentation hold.
 */
export function computeToolkitLeftHeadingPose(
  rawProgress: number,
): ToolkitLeftHeadingPose {
  const p = clamp01(rawProgress);

  if (p <= PRISM_TURN_END || p >= PRISM_PRESENT_END) {
    return {
      visible: false,
      opacity: 0,
      translateX: p <= PRISM_TURN_END ? -10 : 0,
      translateY: p <= PRISM_TURN_END ? 14 : -10,
    };
  }

  const enterT = smoothstep(PRISM_TURN_END, LEFT_HEADING_REVEAL_END, p);
  const exitT = smoothstep(LEFT_HEADING_FADEOUT_START, PRISM_PRESENT_END, p);
  const opacity = round3(clamp01(enterT * (1 - exitT)));

  const enterEase = easeOutCubic(enterT);
  const translateX = round3(lerp(-10, 0, enterEase));
  const translateY = round3(lerp(14, 0, enterEase) + lerp(0, -10, exitT));

  return {
    visible: opacity > 0.004,
    opacity,
    translateX,
    translateY,
  };
}
