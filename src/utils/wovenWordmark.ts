export type WovenOrientation = 'h' | 'v';

export interface WovenDashParticle {
  col: number;
  row: number;
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  orientation: WovenOrientation;
  /** Normalized entrance stagger [0..0.55] used by GSAP ScrollTrigger weave-in */
  enterPhase: number;
}

export interface WovenPointer {
  x: number;
  y: number;
  active: boolean;
}

export interface WovenPhysicsConfig {
  repulsionRadius: number;
  repulsionStrength: number;
  springStiffness: number;
  damping: number;
}

export const DEFAULT_WOVEN_PHYSICS: WovenPhysicsConfig = {
  repulsionRadius: 110,
  repulsionStrength: 2300,
  springStiffness: 215,
  damping: 9.8,
};

export interface WovenGridLayout {
  particles: WovenDashParticle[];
  cellSize: number;
  cols: number;
  rows: number;
  gridLeft: number;
  gridTop: number;
  gridWidth: number;
  gridHeight: number;
}

export interface AlphaMaskSampleInput {
  cols: number;
  rows: number;
  alphaAt: (col: number, row: number) => number;
  canvasWidth: number;
  canvasHeight: number;
  threshold?: number;
  padX?: number;
  padY?: number;
}

/**
 * Computes eased vertical slide-up offset and opacity for a particle during
 * GSAP ScrollTrigger's weave-in entrance (`weaveProgress` in [0, 1]).
 */
export function computeParticleWeaveState(
  enterPhase: number,
  weaveProgress: number,
  travelPx = 22,
): { offsetY: number; opacity: number } {
  const span = 0.45;
  const clampedStart = Math.max(0, Math.min(0.55, enterPhase));
  const raw = (weaveProgress - clampedStart) / span;
  const t = Math.max(0, Math.min(1, raw));
  // Cubic ease-out
  const eased = 1 - Math.pow(1 - t, 3);
  return {
    offsetY: (1 - eased) * travelPx,
    opacity: eased,
  };
}

/**
 * Samples an arbitrary 2D alpha mask (e.g. offscreen Geist font raster) into
 * crisp alternating horizontal (-) and vertical (|) woven textile dashes.
 */
export function sampleAlphaMaskToWovenParticles({
  cols,
  rows,
  alphaAt,
  canvasWidth,
  canvasHeight,
  threshold = 96,
  padX,
  padY,
}: AlphaMaskSampleInput): WovenGridLayout {
  if (cols <= 0 || rows <= 0 || canvasWidth <= 0 || canvasHeight <= 0) {
    return {
      particles: [],
      cellSize: 0,
      cols: 0,
      rows: 0,
      gridLeft: 0,
      gridTop: 0,
      gridWidth: 0,
      gridHeight: 0,
    };
  }

  const resolvedPadX = padX ?? Math.max(4, canvasWidth * 0.01);
  const resolvedPadY = padY ?? Math.max(6, canvasHeight * 0.12);
  const availW = Math.max(1, canvasWidth - resolvedPadX * 2);
  const availH = Math.max(1, canvasHeight - resolvedPadY * 2);

  const cellSize = Math.min(availW / cols, availH / rows);
  const gridWidth = cols * cellSize;
  const gridHeight = rows * cellSize;
  const gridLeft = (canvasWidth - gridWidth) / 2;
  const gridTop = (canvasHeight - gridHeight) / 2;

  const particles: WovenDashParticle[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (alphaAt(c, r) < threshold) continue;

      const homeX = gridLeft + (c + 0.5) * cellSize;
      const homeY = gridTop + (r + 0.5) * cellSize;
      const colNorm = cols > 1 ? c / (cols - 1) : 0;
      const rowNorm = rows > 1 ? r / (rows - 1) : 0;
      const enterPhase = Math.min(0.55, colNorm * 0.38 + rowNorm * 0.17);

      particles.push({
        col: c,
        row: r,
        homeX,
        homeY,
        x: homeX,
        y: homeY,
        vx: 0,
        vy: 0,
        orientation: (c + r) % 2 === 0 ? 'h' : 'v',
        enterPhase,
      });
    }
  }

  return {
    particles,
    cellSize,
    cols,
    rows,
    gridLeft,
    gridTop,
    gridWidth,
    gridHeight,
  };
}

const GLYPH_BITMAPS: Record<string, readonly string[]> = {
  D: [
    '######..',
    '#######.',
    '##....##',
    '##....##',
    '##....##',
    '##....##',
    '##....##',
    '##....##',
    '##....##',
    '#######.',
    '######..',
  ],
  U: [
    '##....##',
    '##....##',
    '##....##',
    '##....##',
    '##....##',
    '##....##',
    '##....##',
    '##....##',
    '##....##',
    '.######.',
    '..####..',
  ],
  S: [
    '.######.',
    '########',
    '##....##',
    '##......',
    '.#####..',
    '..#####.',
    '......##',
    '......##',
    '##....##',
    '########',
    '.######.',
  ],
  H: [
    '##....##',
    '##....##',
    '##....##',
    '##....##',
    '########',
    '########',
    '##....##',
    '##....##',
    '##....##',
    '##....##',
    '##....##',
  ],
  Y: [
    '##....##',
    '##....##',
    '.##..##.',
    '..####..',
    '...##...',
    '...##...',
    '...##...',
    '...##...',
    '...##...',
    '...##...',
    '...##...',
  ],
  A: [
    '..####..',
    '.######.',
    '##....##',
    '##....##',
    '##....##',
    '########',
    '########',
    '##....##',
    '##....##',
    '##....##',
    '##....##',
  ],
  N: [
    '##....##',
    '###...##',
    '####..##',
    '##.##.##',
    '##..####',
    '##...###',
    '##....##',
    '##....##',
    '##....##',
    '##....##',
    '##....##',
  ],
  T: [
    '########',
    '########',
    '...##...',
    '...##...',
    '...##...',
    '...##...',
    '...##...',
    '...##...',
    '...##...',
    '...##...',
    '...##...',
  ],
};

export const WOVEN_ROWS = 11;
export const WOVEN_GLYPH_COLS = 8;
export const WOVEN_LETTER_GAP_COLS = 2;

export function getWovenWordmarkGridDimensions(text: string): {
  cols: number;
  rows: number;
} {
  const chars = text.toUpperCase().split('').filter((c) => c in GLYPH_BITMAPS);
  if (chars.length === 0) {
    return { cols: 0, rows: WOVEN_ROWS };
  }
  const cols =
    chars.length * WOVEN_GLYPH_COLS +
    Math.max(0, chars.length - 1) * WOVEN_LETTER_GAP_COLS;
  return { cols, rows: WOVEN_ROWS };
}

/**
 * Fallback bitmap wordmark sampler (used in SSR/tests and if offscreen font sampling is unavailable).
 */
export function buildWovenWordmarkParticles(
  text: string,
  canvasWidth: number,
  canvasHeight: number,
): WovenGridLayout {
  const chars = text.toUpperCase().split('').filter((c) => c in GLYPH_BITMAPS);
  if (chars.length === 0 || canvasWidth <= 0 || canvasHeight <= 0) {
    return {
      particles: [],
      cellSize: 0,
      cols: 0,
      rows: 0,
      gridLeft: 0,
      gridTop: 0,
      gridWidth: 0,
      gridHeight: 0,
    };
  }

  const { cols, rows } = getWovenWordmarkGridDimensions(text);
  const stride = WOVEN_GLYPH_COLS + WOVEN_LETTER_GAP_COLS;

  return sampleAlphaMaskToWovenParticles({
    cols,
    rows,
    canvasWidth,
    canvasHeight,
    threshold: 128,
    alphaAt: (col, row) => {
      const charIndex = Math.floor(col / stride);
      const localCol = col % stride;
      if (charIndex >= chars.length || localCol >= WOVEN_GLYPH_COLS) return 0;
      const bitmap = GLYPH_BITMAPS[chars[charIndex]];
      return bitmap?.[row]?.[localCol] === '#' ? 255 : 0;
    },
  });
}

/**
 * Steps Hooke's law + exponential damping spring physics with radial cursor repulsion.
 * Returns true if any particle is still moving meaningfully.
 */
export function stepWovenParticles(
  particles: WovenDashParticle[],
  pointer: WovenPointer,
  dt: number,
  config: WovenPhysicsConfig = DEFAULT_WOVEN_PHYSICS,
): boolean {
  const safeDt = Math.min(0.035, Math.max(0.001, dt));
  const dampFactor = Math.exp(-config.damping * safeDt);
  let active = false;

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];

    // Hooke's law spring restoring force toward original grid coordinate
    let ax = -config.springStiffness * (p.x - p.homeX);
    let ay = -config.springStiffness * (p.y - p.homeY);

    // Outward repulsion force near active cursor
    if (pointer.active && config.repulsionRadius > 0) {
      const dx = p.x - pointer.x;
      const dy = p.y - pointer.y;
      const distSq = dx * dx + dy * dy;
      const maxR = config.repulsionRadius;

      if (distSq < maxR * maxR) {
        const dist = Math.sqrt(distSq);
        const falloff = Math.pow(1 - dist / maxR, 1.45);
        const force = config.repulsionStrength * falloff;

        if (dist > 0.5) {
          ax += (dx / dist) * force;
          ay += (dy / dist) * force;
        } else {
          // Deterministic outward push if pointer sits dead-center on a dash
          const angle = ((p.col * 7 + p.row * 13) % 12) * ((Math.PI * 2) / 12);
          ax += Math.cos(angle) * force;
          ay += Math.sin(angle) * force;
        }
      }
    }

    p.vx = (p.vx + ax * safeDt) * dampFactor;
    p.vy = (p.vy + ay * safeDt) * dampFactor;
    p.x += p.vx * safeDt;
    p.y += p.vy * safeDt;

    if (
      Math.abs(p.x - p.homeX) > 0.08 ||
      Math.abs(p.y - p.homeY) > 0.08 ||
      Math.abs(p.vx) > 0.15 ||
      Math.abs(p.vy) > 0.15
    ) {
      active = true;
    } else if (!pointer.active) {
      p.x = p.homeX;
      p.y = p.homeY;
      p.vx = 0;
      p.vy = 0;
    }
  }

  return active || pointer.active;
}
