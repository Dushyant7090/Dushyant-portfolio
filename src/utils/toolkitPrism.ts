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
    opacity = smoothstep(0, 0.14, tTurn);
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
