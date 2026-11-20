export interface TrailNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  age: number;
  maxAge: number;
}

export const DEFAULT_GLYPH_POOL =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*+=?!';

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function lerpRgbColor(
  rgbA: [number, number, number],
  rgbB: [number, number, number],
  t: number
): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  return [
    Math.round(rgbA[0] + (rgbB[0] - rgbA[0]) * clamped),
    Math.round(rgbA[1] + (rgbB[1] - rgbA[1]) * clamped),
    Math.round(rgbA[2] + (rgbB[2] - rgbA[2]) * clamped),
  ];
}

export function createTrailNode(
  x: number,
  y: number,
  vx: number,
  vy: number,
  baseRadius: number,
  thickness: number,
  trailLength: number
): TrailNode {
  const speed = Math.hypot(vx, vy);
  // Fast strokes swell slightly; slow movements taper cleanly
  const speedBoost = Math.min(1.55, 0.72 + speed * 0.00085);
  return {
    x,
    y,
    vx: vx * 0.12,
    vy: vy * 0.12,
    radius: Math.max(8, baseRadius * thickness * speedBoost),
    age: 0,
    maxAge: Math.max(0.15, trailLength),
  };
}

export function createSplashBurst(
  x: number,
  y: number,
  count: number,
  baseRadius: number,
  trailLength: number
): TrailNode[] {
  const nodes: TrailNode[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (i % 2 === 0 ? 0.15 : -0.15);
    const speed = 130 + (i % 3) * 55;
    nodes.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: Math.max(10, baseRadius * (0.75 + (i % 3) * 0.18)),
      age: 0,
      maxAge: Math.max(0.2, trailLength * 0.85),
    });
  }
  return nodes;
}

export function stepTrailNodes(
  nodes: TrailNode[],
  dtSeconds: number,
  viscosity = 4.5
): TrailNode[] {
  const dt = Math.max(0, Math.min(0.05, dtSeconds));
  const damping = Math.exp(-viscosity * dt);
  const next: TrailNode[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const age = n.age + dt;
    if (age >= n.maxAge) {
      continue;
    }
    const life = 1 - age / n.maxAge;
    next.push({
      x: n.x + n.vx * dt,
      y: n.y + n.vy * dt,
      vx: n.vx * damping,
      vy: n.vy * damping,
      radius: n.radius * (0.985 + 0.015 * life),
      age,
      maxAge: n.maxAge,
    });
  }

  return next;
}

export function computeCellActivation(
  cellCenterX: number,
  cellCenterY: number,
  nodes: TrailNode[]
): { intensity: number; ageRatio: number } {
  let field = 0;
  let weightedAge = 0;
  let weightSum = 0;

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const dx = cellCenterX - n.x;
    const dy = cellCenterY - n.y;
    const r = n.radius;
    const distSq = dx * dx + dy * dy;
    const maxDistSq = r * r;

    if (distSq >= maxDistSq) {
      continue;
    }

    const life = 1 - n.age / n.maxAge;
    // Smooth cubic kernel falloff for liquid metaball blending
    const falloff = 1 - distSq / maxDistSq;
    const contrib = falloff * falloff * life;
    field += contrib;
    weightedAge += (n.age / n.maxAge) * contrib;
    weightSum += contrib;
  }

  if (field <= 0.04) {
    return { intensity: 0, ageRatio: 1 };
  }

  return {
    intensity: Math.min(1, field),
    ageRatio: weightSum > 0 ? weightedAge / weightSum : 1,
  };
}

export function pickStreamGlyph(
  col: number,
  row: number,
  stepTick: number,
  pool: string = DEFAULT_GLYPH_POOL
): string {
  const hash = Math.abs((col * 73856093) ^ (row * 19349663) ^ (stepTick * 83492791));
  return pool[hash % pool.length];
}
