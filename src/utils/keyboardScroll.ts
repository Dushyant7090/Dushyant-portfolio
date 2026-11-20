export type KeyboardScrollDirection = 1 | -1;

export interface KeyboardScrollCheckInput {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  defaultPrevented?: boolean;
  tagName?: string | null;
  isContentEditable?: boolean;
}

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'OPTION']);

/**
 * Determines whether an ArrowDown / ArrowUp keyboard event should drive vertical scrolling.
 * Returns 1 for down, -1 for up, or null if the event should be ignored.
 */
export function resolveArrowScrollDirection(
  input: KeyboardScrollCheckInput,
): KeyboardScrollDirection | null {
  if (input.defaultPrevented) return null;
  if (input.ctrlKey || input.metaKey || input.altKey) return null;

  const upperTag = (input.tagName ?? '').toUpperCase();
  if (EDITABLE_TAGS.has(upperTag) || input.isContentEditable) {
    return null;
  }

  if (input.key === 'ArrowDown') return 1;
  if (input.key === 'ArrowUp') return -1;
  return null;
}

/**
 * Computes a responsive scroll step in pixels proportional to viewport height.
 */
export function computeArrowScrollStepPx(
  viewportHeight: number,
  isRepeat: boolean,
): number {
  const safeHeight = Number.isFinite(viewportHeight)
    ? Math.max(320, viewportHeight)
    : 900;
  const ratio = isRepeat ? 0.14 : 0.17;
  return Math.round(Math.min(220, Math.max(96, safeHeight * ratio)));
}

/**
 * Clamps a target scroll position safely within [0, maxScrollY].
 */
export function clampTargetScrollY(
  targetY: number,
  maxScrollY: number,
): number {
  const safeMax = Math.max(0, Number.isFinite(maxScrollY) ? maxScrollY : 0);
  if (!Number.isFinite(targetY)) return 0;
  return Math.min(safeMax, Math.max(0, targetY));
}
