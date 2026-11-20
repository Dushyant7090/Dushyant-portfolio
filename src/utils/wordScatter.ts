export const INTRO_PARAGRAPH =
  "Hello! I'm Dushyant Beniwal, an MCA student specializing in Data Analytics at PES University. With a foundation in computer science from my BCA at JSS SMI, Dharwad, I've developed a strong interest in understanding data, uncovering meaningful patterns, and building practical, user-focused solutions. Alongside my academic journey, I'm exploring the world of open-source development through my contributions to omegaUp, continuously learning, experimenting, and growing as a software developer.";

export interface WordScatterOffset {
  x: number;
  initialOpacity: number;
}

/**
 * Generates deterministic, subtle, irregular horizontal offsets for scattered words
 * scaled safely by viewport width so lines stay balanced without horizontal overflow.
 */
export function computeWordScatterOffsets(
  wordCount: number,
  viewportWidth: number
): WordScatterOffset[] {
  if (wordCount <= 0) {
    return [];
  }

  const maxOffset =
    viewportWidth >= 1024 ? 28 : viewportWidth >= 640 ? 20 : 12;
  const maxConvergence =
    viewportWidth >= 1024 ? 4 : viewportWidth >= 640 ? 3 : 2;

  const offsets: WordScatterOffset[] = [];

  for (let i = 0; i < wordCount; i++) {
    const raw = Math.sin((i + 1) * 12.9898 + 4.1414) * 43758.5453;
    const frac = raw - Math.floor(raw);

    let x: number;
    if (i === 0) {
      // Keep the opening word nudged inward so it never clips the left padding edge
      x = Math.round(maxOffset * 0.75);
    } else {
      const wave =
        Math.sin(i * 0.34 + 0.45) * 0.7 + Math.cos(i * 0.73 - 0.25) * 0.3;
      const target = Math.round(wave * maxOffset);
      const prevX = offsets[i - 1].x;

      // Never allow consecutive words to converge more than maxConvergence px
      // so natural space characters prevent glyph collisions.
      x = Math.min(maxOffset, Math.max(target, prevX - maxConvergence));
      if (x === 0) {
        x = prevX > 0 ? 1 : -1;
      }
    }

    const initialOpacity = Math.round((0.46 + frac * 0.28) * 100) / 100;

    offsets.push({
      x,
      initialOpacity,
    });
  }

  return offsets;
}

export const LINE_REVEAL_START_PROGRESS = 0.04;
export const REASSEMBLY_SETTLE_PROGRESS = 0.46;
export const EXIT_START_PROGRESS = 0.54;
export const EXIT_END_PROGRESS = 0.96;

export type IntroPhase = 'entering' | 'assembled' | 'exiting' | 'exited';

export interface LineRevealWindow {
  index: number;
  initiallyVisible: boolean;
  enterStart: number;
  enterEnd: number;
  wordStart: number;
  wordEnd: number;
  exitStart: number;
  exitEnd: number;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Computes scroll-progress windows [0..1] for a two-act introduction sequence:
 * 1) Line 0 appears immediately on entry and lines 1..N-1 emerge one by one (0..0.46),
 * 2) Complete paragraph rests cleanly while readable (0.46..0.54),
 * 3) Lines dissolve one by one starting from the top line (0) downward to line N-1 (0.54..0.96).
 */
export function computeLineRevealSchedule(lineCount: number): LineRevealWindow[] {
  if (lineCount <= 0) {
    return [];
  }

  const exitSpan = EXIT_END_PROGRESS - EXIT_START_PROGRESS;
  const exitStep = exitSpan / lineCount;

  const computeExitWindow = (lineIdx: number) => {
    const slotStart = EXIT_START_PROGRESS + lineIdx * exitStep;
    return {
      exitStart: round3(slotStart),
      exitEnd: round3(Math.min(EXIT_END_PROGRESS, slotStart + exitStep * 0.92)),
    };
  };

  const windows: LineRevealWindow[] = [
    {
      index: 0,
      initiallyVisible: true,
      enterStart: 0,
      enterEnd: 0,
      wordStart: 0,
      wordEnd: lineCount === 1 ? REASSEMBLY_SETTLE_PROGRESS : 0.08,
      ...computeExitWindow(0),
    },
  ];

  if (lineCount === 1) {
    return windows;
  }

  const remaining = lineCount - 1;
  const startOffset = LINE_REVEAL_START_PROGRESS;
  const span = REASSEMBLY_SETTLE_PROGRESS - startOffset;
  const step = span / remaining;

  for (let k = 1; k < lineCount; k++) {
    const slotStart = startOffset + (k - 1) * step;
    windows.push({
      index: k,
      initiallyVisible: false,
      enterStart: round3(slotStart),
      enterEnd: round3(slotStart + step * 0.62),
      wordStart: round3(slotStart + step * 0.08),
      wordEnd: round3(Math.min(REASSEMBLY_SETTLE_PROGRESS, slotStart + step * 0.96)),
      ...computeExitWindow(k),
    });
  }

  return windows;
}

export function getIntroPhase(progress: number): IntroPhase {
  if (progress < REASSEMBLY_SETTLE_PROGRESS) return 'entering';
  if (progress < EXIT_START_PROGRESS) return 'assembled';
  if (progress < EXIT_END_PROGRESS) return 'exiting';
  return 'exited';
}

export function isParagraphReassembled(progress: number): boolean {
  return progress >= REASSEMBLY_SETTLE_PROGRESS && progress < EXIT_START_PROGRESS;
}
