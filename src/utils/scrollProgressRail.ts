export interface ScrollSectionDef {
  id: string;
  number: string;
  label: string;
}

export interface RailTick {
  id: string;
  position: number; // normalized [0..1] along the rail
  sectionIndex: number | null;
}

export const PORTFOLIO_SECTIONS: readonly ScrollSectionDef[] = [
  { id: 'top', number: '01', label: 'INTRO' },
  { id: 'about', number: '02', label: 'ABOUT' },
  { id: 'toolkit', number: '03', label: 'TOOLKIT' },
  { id: 'work', number: '04', label: 'WORK' },
  { id: 'contact', number: '05', label: 'CONTACT' },
];

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

/**
 * Computes normalized vertical scroll progress [0..1] across the entire document.
 */
export function computePageScrollProgress(
  scrollY: number,
  scrollHeight: number,
  viewportHeight: number,
): number {
  const maxScroll = scrollHeight - viewportHeight;
  if (maxScroll <= 0) return 0;
  return clamp01(scrollY / maxScroll);
}

/**
 * Determines which section is currently active given ordered section offsetTops
 * and viewport dimensions. Works symmetrically when scrolling down or up.
 */
export function resolveActiveSectionIndex(
  scrollY: number,
  viewportHeight: number,
  scrollHeight: number,
  sectionTops: readonly number[],
): number {
  if (sectionTops.length === 0) return 0;

  // Snap cleanly to the final section when reaching the bottom of the page
  if (scrollHeight > viewportHeight && scrollY + viewportHeight >= scrollHeight - 24) {
    return sectionTops.length - 1;
  }

  const anchorY = scrollY + viewportHeight * 0.35;
  for (let i = sectionTops.length - 1; i >= 0; i--) {
    if (sectionTops[i] <= anchorY) {
      return i;
    }
  }
  return 0;
}

/**
 * Normalizes section offsetTops into rail positions [0..1], clamping monotonically
 * and anchoring the final section near the bottom of the track.
 */
export function computeSectionRailStops(
  sectionTops: readonly number[],
  scrollHeight: number,
  viewportHeight: number,
): number[] {
  if (sectionTops.length === 0) return [];
  if (sectionTops.length === 1) return [0];

  const maxScroll = Math.max(1, scrollHeight - viewportHeight);
  const stops = sectionTops.map((top, index) => {
    if (index === 0) return 0;
    if (index === sectionTops.length - 1) return 1;
    return clamp01(top / maxScroll);
  });

  // Enforce gentle minimum separation so adjacent bottom section ticks remain distinct
  for (let i = 1; i < stops.length - 1; i++) {
    stops[i] = Math.max(stops[i], stops[i - 1] + 0.04);
    stops[i] = Math.min(stops[i], 0.96);
  }
  for (let i = stops.length - 2; i >= 1; i--) {
    if (stops[i] > stops[i + 1] - 0.04) {
      stops[i] = Math.max(0.04, stops[i + 1] - 0.04);
    }
  }

  return stops;
}

/**
 * Builds tick marks anchored at each section stop, subdivided at regular intervals
 * across tall pinned sections so ticks stay visually balanced along the entire track.
 */
export function buildRailTicks(
  sectionStops: readonly number[],
  maxInterval = 0.125,
): RailTick[] {
  if (sectionStops.length === 0) return [];

  const ticks: RailTick[] = [];
  for (let i = 0; i < sectionStops.length; i++) {
    const pos = clamp01(sectionStops[i]);
    ticks.push({
      id: `section-${i}`,
      position: pos,
      sectionIndex: i,
    });

    if (i < sectionStops.length - 1) {
      const nextPos = clamp01(sectionStops[i + 1]);
      const span = nextPos - pos;
      if (span > maxInterval * 1.35) {
        const segments = Math.round(span / maxInterval);
        for (let step = 1; step < segments; step++) {
          ticks.push({
            id: `sub-${i}-${step}`,
            position: pos + (span * step) / segments,
            sectionIndex: null,
          });
        }
      }
    }
  }

  return ticks;
}

/**
 * Frame-rate-independent exponential smoothing for silky indicator motion.
 */
export function stepRailProgress(
  current: number,
  target: number,
  dtSeconds: number,
  speed = 16,
): number {
  const clampedDt = Math.max(0, Math.min(0.05, dtSeconds));
  const alpha = 1 - Math.exp(-speed * clampedDt);
  const next = current + (target - current) * alpha;
  return Math.abs(target - next) < 0.0004 ? target : next;
}
