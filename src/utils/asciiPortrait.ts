export interface AsciiCell {
  char: string;
  color: string;
  luminance: number;
}

/**
 * Character buckets ordered from darkest/densest ink to lightest/sparsest stroke.
 * Every bucket mixes uppercase letters, lowercase letters, numbers, and special symbols.
 */
export const DENSITY_BUCKETS: readonly string[] = [
  '@#W8&M',     // 0: deepest shadow (hair, pupils, dark tie)
  'B0Q$9%',     // 1: dark tone
  'Xg4k2A',     // 2: dark-mid tone (suit shadow, brows)
  'Z7h5R#',     // 3: mid-dark (suit fabric, beard)
  'e3y6P?',     // 4: mid tone
  'u1c*+s',     // 5: mid-light (skin midtones)
  'v=r/i!',     // 6: light (skin highlights)
  '~;:-^,',     // 7: very light (collar edges)
  '.`\'· ',     // 8: brightest (white shirt core)
];

export const SCRAMBLE_POOL =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*+=?!/:;';

/**
 * Computes perceptual relative luminance (0..255) from RGB channels.
 */
export function getLuminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Selects a character from the density bucket matching pixel luminance,
 * using deterministic spatial variation so neighboring same-tone pixels
 * display a genuine mix of letters, numbers, and special symbols.
 */
export function pickAsciiChar(
  luminance: number,
  col: number,
  row: number,
  seedOffset = 0
): string {
  const clamped = Math.max(0, Math.min(255, luminance));
  const bucketIndex = Math.min(
    DENSITY_BUCKETS.length - 1,
    Math.floor((clamped / 256) * DENSITY_BUCKETS.length)
  );
  const bucket = DENSITY_BUCKETS[bucketIndex];
  const hash = Math.abs((col * 73856093) ^ (row * 19349663) ^ (seedOffset * 83492791));
  return bucket[hash % bucket.length];
}

/**
 * Maps RGBA pixel values to an ink-readable color on the #F9F8F5 warm paper canvas.
 * Ensures bright highlights (e.g., white shirt collar) remain subtly legible rather than vanishing.
 */
export function getInkColor(r: number, g: number, b: number): string {
  const lum = getLuminance(r, g, b);
  // Map pixel luminance (0..255) across deep violet shadows -> #6A0DAD midtones -> soft violet highlights
  const t = Math.max(0, Math.min(1, lum / 255));
  if (t > 0.82) {
    // Keep white shirt/collar details cleanly visible in soft violet on #F9F8F5
    return 'rgb(184, 128, 224)';
  }
  // Interpolate from deep violet (58, 6, 98) through signature #6A0DAD (106, 13, 173)
  const norm = t / 0.82;
  const red = Math.round(58 + (154 - 58) * norm);
  const green = Math.round(6 + (72 - 6) * norm);
  const blue = Math.round(98 + (212 - 98) * norm);
  return `rgb(${red}, ${green}, ${blue})`;
}

/**
 * Samples a single pixel into an AsciiCell or null if transparent background.
 */
export function samplePixelToCell(
  r: number,
  g: number,
  b: number,
  a: number,
  col: number,
  row: number,
  seedOffset = 0
): AsciiCell | null {
  if (a <= 28) {
    return null;
  }

  const rawLum = getLuminance(r, g, b);
  // Subtle S-curve contrast boost around midpoint 128 for sharper facial definition
  const luminance = Math.max(0, Math.min(255, (rawLum - 128) * 1.26 + 128));
  const char = pickAsciiChar(luminance, col, row, seedOffset);
  if (char === ' ') {
    return null;
  }

  return {
    char,
    color: getInkColor(r, g, b),
    luminance,
  };
}

export interface LensState {
  x: number;
  y: number;
  radius: number;
}

/**
 * Advances lens position and radius toward target using frame-rate-independent
 * exponential damping so cursor tracking stays silky smooth at any refresh rate.
 */
export function stepLensState(
  current: LensState,
  target: LensState,
  dtSeconds: number,
  posSpeed = 22,
  radiusSpeed = 16
): LensState {
  const clampedDt = Math.max(0, Math.min(0.05, dtSeconds));
  const posAlpha = 1 - Math.exp(-posSpeed * clampedDt);
  const radAlpha = 1 - Math.exp(-radiusSpeed * clampedDt);

  const nextX = current.x + (target.x - current.x) * posAlpha;
  const nextY = current.y + (target.y - current.y) * posAlpha;
  const nextRadius = current.radius + (target.radius - current.radius) * radAlpha;

  return {
    x: Math.abs(target.x - nextX) < 0.05 ? target.x : nextX,
    y: Math.abs(target.y - nextY) < 0.05 ? target.y : nextY,
    radius: Math.abs(target.radius - nextRadius) < 0.1 ? target.radius : nextRadius,
  };
}
