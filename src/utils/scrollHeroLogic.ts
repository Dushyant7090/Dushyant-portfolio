import { KINETIC_PHRASES } from './kineticPhrases';

export interface ScrollOffsets {
  x: number;
  y: number;
}

export interface RectBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ViewportBox {
  width: number;
  height: number;
  topReserve?: number;
  bottomReserve?: number;
}

export interface PhraseWindow {
  enterStart: number;
  enterEnd: number;
  exitStart: number | null;
  exitEnd: number | null;
  holdMid: number;
}

/**
 * Computes the translation needed to place a resting element's box
 * centered in the target viewport box.
 */
export function computeCenterOffset(
  restingRect: RectBox,
  viewport: ViewportBox
): ScrollOffsets {
  const topReserve = viewport.topReserve ?? 0;
  const bottomReserve = viewport.bottomReserve ?? 0;
  const targetCenterX = viewport.width / 2;
  const targetCenterY =
    topReserve + (viewport.height - topReserve - bottomReserve) / 2;

  const currentCenterX = restingRect.left + restingRect.width / 2;
  const currentCenterY = restingRect.top + restingRect.height / 2;

  return {
    x: Math.round(targetCenterX - currentCenterX),
    y: Math.round(targetCenterY - currentCenterY),
  };
}

/**
 * Computes an initial dominating scale factor (>= 1.08) that enlarges the centered
 * portrait proportionally without overflowing the viewport horizontally or vertically.
 */
export function computeInitialHeroScale(
  restingRect: { width: number; height: number },
  viewport: ViewportBox
): number {
  if (restingRect.width <= 0 || restingRect.height <= 0) {
    return 1;
  }
  const topReserve = viewport.topReserve ?? 0;
  const bottomReserve = viewport.bottomReserve ?? 44;
  const availWidth = viewport.width * 0.9;
  const availHeight = Math.max(
    180,
    (viewport.height - topReserve - bottomReserve) * 0.9
  );

  const maxScaleByWidth = availWidth / restingRect.width;
  const maxScaleByHeight = availHeight / restingRect.height;
  const fitScale = Math.min(maxScaleByWidth, maxScaleByHeight);

  const isDesktop = viewport.width >= 1024;
  const desiredMax = isDesktop ? 1.38 : 1.24;
  const clamped = Math.min(desiredMax, fitScale);

  return Math.round(Math.max(1.08, clamped) * 1000) / 1000;
}

/**
 * Computes the compact final scale once the portrait settles on the right / bottom.
 */
export function computeEndHeroScale(viewportWidth: number): number {
  return viewportWidth >= 1024 ? 0.74 : 0.8;
}

/**
 * Computes the final translation so the scaled-down portrait stays flush with the
 * right column edge on desktop and centered horizontally on mobile.
 */
export function computeEndOffset(
  restingWidth: number,
  endScale: number,
  isDesktop: boolean
): ScrollOffsets {
  if (!isDesktop || endScale >= 1) {
    return { x: 0, y: 0 };
  }
  return {
    x: Math.round((restingWidth * (1 - endScale)) / 2),
    y: 0,
  };
}

/**
 * Computes progressive intermediate keyframes for the portrait's shrink-and-settle
 * transition from viewport-center (progress = 0) to right-side compact spot (progress = 0.22).
 */
export function computeProgressiveStages(
  centerOffset: ScrollOffsets,
  initialScale: number,
  endScale = 0.74,
  endOffset: ScrollOffsets = { x: 0, y: 0 }
) {
  const scaleSpan = initialScale - endScale;
  const dx = endOffset.x - centerOffset.x;
  const dy = endOffset.y - centerOffset.y;

  return {
    start: { x: centerOffset.x, y: centerOffset.y, scale: initialScale },
    stage1: {
      x: Math.round(centerOffset.x + dx * 0.28),
      y: Math.round(centerOffset.y + dy * 0.32),
      scale: Math.round((endScale + scaleSpan * 0.62) * 1000) / 1000,
    },
    stage2: {
      x: Math.round(centerOffset.x + dx * 0.74),
      y: Math.round(centerOffset.y + dy * 0.78),
      scale: Math.round((endScale + scaleSpan * 0.22) * 1000) / 1000,
    },
    end: { x: endOffset.x, y: endOffset.y, scale: endScale },
  };
}

/**
 * Normalized scroll progress boundaries across the extended pinned track (900vh):
 * - 0.00 -> 0.22: portrait shrinks progressively & moves to the right column (intro hidden)
 * - 0.22 -> 1.00: portrait settled right, phrases 01..05 scrub deliberately via horizontal gradient masks
 */
export const PORTRAIT_SETTLE_PROGRESS = 0.22;
export const INTRO_REVEAL_THRESHOLD = PORTRAIT_SETTLE_PROGRESS;

export const PHRASE_WINDOWS: readonly PhraseWindow[] = [
  {
    // 01: HELLO, I'M DUSHYANT.
    enterStart: 0.22,
    enterEnd: 0.3,
    exitStart: 0.34,
    exitEnd: 0.386,
    holdMid: 0.32,
  },
  {
    // 02: BEYOND THE NUMBERS.
    enterStart: 0.386,
    enterEnd: 0.464,
    exitStart: 0.504,
    exitEnd: 0.55,
    holdMid: 0.484,
  },
  {
    // 03: CURIOUS ABOUT THE WHY.
    enterStart: 0.55,
    enterEnd: 0.628,
    exitStart: 0.668,
    exitEnd: 0.714,
    holdMid: 0.648,
  },
  {
    // 04: EXPLORING PATTERNS.
    enterStart: 0.714,
    enterEnd: 0.792,
    exitStart: 0.832,
    exitEnd: 0.878,
    holdMid: 0.812,
  },
  {
    // 05: TURNING COMPLEXITY INTO CLARITY.
    enterStart: 0.878,
    enterEnd: 0.958,
    exitStart: null,
    exitEnd: null,
    holdMid: 0.98,
  },
];

export const PHRASE_THRESHOLDS: readonly number[] = PHRASE_WINDOWS.map(
  (w) => w.enterStart
);

export function isIntroRevealed(progress: number): boolean {
  return progress >= INTRO_REVEAL_THRESHOLD;
}

export function getPhraseIndexForProgress(progress: number): number {
  const clamped = Math.max(0, Math.min(1, progress));
  let active = 0;
  for (let i = 0; i < PHRASE_WINDOWS.length; i++) {
    if (clamped >= PHRASE_WINDOWS[i].enterStart) {
      active = i;
    }
  }
  return Math.min(KINETIC_PHRASES.length - 1, active);
}

/**
 * Returns the normalized scroll progress [0..1] inside the phrase's crisp hold band.
 */
export function getProgressForPhraseIndex(phraseIndex: number): number {
  const clampedIdx = Math.max(
    0,
    Math.min(PHRASE_WINDOWS.length - 1, phraseIndex)
  );
  return PHRASE_WINDOWS[clampedIdx].holdMid;
}
