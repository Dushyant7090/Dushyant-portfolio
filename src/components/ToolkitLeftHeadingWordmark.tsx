import type { ToolkitLeftHeadingLinesMode } from '../utils/toolkitPrism';

interface ToolkitLeftHeadingWordmarkProps {
  linesMode: ToolkitLeftHeadingLinesMode;
  lineHeightPx: number;
  lineGapPx: number;
}

function GlyphThe({ x = 0 }: { x?: number }) {
  return (
    <g transform={`translate(${x}, 0)`}>
      {/* T (0..38) */}
      <path d="M0 0H38V9H23.5V48H14.5V9H0V0Z" />
      {/* H (48..86) */}
      <path transform="translate(48, 0)" d="M0 0H9V19.5H29V0H38V48H29V28.5H9V48H0V0Z" />
      {/* E (96..130) */}
      <path transform="translate(96, 0)" d="M0 0H34V9H9V19.5H29V28.5H9V39H34V48H0V0Z" />
    </g>
  );
}

function GlyphThings({ x = 0 }: { x?: number }) {
  return (
    <g transform={`translate(${x}, 0)`}>
      {/* T (0..38) */}
      <path d="M0 0H38V9H23.5V48H14.5V9H0V0Z" />
      {/* H (48..86) */}
      <path transform="translate(48, 0)" d="M0 0H9V19.5H29V0H38V48H29V28.5H9V48H0V0Z" />
      {/* I (96..124) */}
      <path transform="translate(96, 0)" d="M0 0H28V9H18.5V39H28V48H0V39H9.5V9H0V0Z" />
      {/* N (134..172) */}
      <path transform="translate(134, 0)" d="M0 0H9.5L29 33V0H38V48H28.5L9 15V48H0V0Z" />
      {/* G (182..222) */}
      <path
        transform="translate(182, 0)"
        d="M8 0H32L40 8V14H31V11L29 9H11L9 11V37L11 39H29L31 37V28.5H21V20H40V40L32 48H8L0 40V8L8 0Z"
      />
      {/* S (232..270) */}
      <path
        transform="translate(232, 0)"
        d="M8 0H30L38 8V14H29V11L27 9H11L9 11V18L11 19.5H30L38 27.5V40L30 48H8L0 40V34H9V37L11 39H27L29 37V30L27 28.5H8L0 20.5V8L8 0Z"
      />
    </g>
  );
}

function GlyphIKnow({ x = 0 }: { x?: number }) {
  return (
    <g transform={`translate(${x}, 0)`}>
      {/* I (0..28) */}
      <path d="M0 0H28V9H18.5V39H28V48H0V39H9.5V9H0V0Z" />
      {/* K (54..96) */}
      <path
        transform="translate(54, 0)"
        d="M0 0H9V48H0V0ZM9 19.5L30 0H41.5L16.5 24L42 48H30L9 28.5V19.5Z"
      />
      {/* N (106..144) */}
      <path transform="translate(106, 0)" d="M0 0H9.5L29 33V0H38V48H28.5L9 15V48H0V0Z" />
      {/* O (154..196) */}
      <path
        transform="translate(154, 0)"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8 0H34L42 8V40L34 48H8L0 40V8L8 0ZM11 9L9 11V37L11 39H31L33 37V11L31 9H11Z"
      />
      {/* W (206..254) */}
      <path
        transform="translate(206, 0)"
        d="M0 0H9L15 32L21 12H27L33 32L39 0H48L39 48H29L24 27L19 48H9L0 0Z"
      />
    </g>
  );
}

export function ToolkitLeftHeadingWordmark({
  linesMode,
  lineHeightPx,
  lineGapPx,
}: ToolkitLeftHeadingWordmarkProps) {
  return (
    <p
      className="m-0 flex flex-col items-start text-[#1A1A1A] select-none"
      style={{ gap: `${lineGapPx}px` }}
    >
      <span className="sr-only">THE THINGS I KNOW</span>

      {linesMode === '1-line' ? (
        <svg
          viewBox="0 0 706 48"
          style={{ height: `${lineHeightPx}px` }}
          className="block w-auto text-[#1A1A1A]"
          fill="currentColor"
          aria-hidden="true"
        >
          <GlyphThe x={0} />
          <GlyphThings x={156} />
          <GlyphIKnow x={452} />
        </svg>
      ) : linesMode === '2-lines' ? (
        <>
          <svg
            viewBox="0 0 420 48"
            style={{ height: `${lineHeightPx}px` }}
            className="block w-auto text-[#1A1A1A]"
            fill="currentColor"
            aria-hidden="true"
          >
            <GlyphThe x={0} />
            <GlyphThings x={150} />
          </svg>
          <svg
            viewBox="0 0 254 48"
            style={{ height: `${lineHeightPx}px` }}
            className="block w-auto text-[#1A1A1A]"
            fill="currentColor"
            aria-hidden="true"
          >
            <GlyphIKnow x={0} />
          </svg>
        </>
      ) : (
        <>
          <svg
            viewBox="0 0 130 48"
            style={{ height: `${lineHeightPx}px` }}
            className="block w-auto text-[#1A1A1A]"
            fill="currentColor"
            aria-hidden="true"
          >
            <GlyphThe x={0} />
          </svg>
          <svg
            viewBox="0 0 270 48"
            style={{ height: `${lineHeightPx}px` }}
            className="block w-auto text-[#1A1A1A]"
            fill="currentColor"
            aria-hidden="true"
          >
            <GlyphThings x={0} />
          </svg>
          <svg
            viewBox="0 0 254 48"
            style={{ height: `${lineHeightPx}px` }}
            className="block w-auto text-[#1A1A1A]"
            fill="currentColor"
            aria-hidden="true"
          >
            <GlyphIKnow x={0} />
          </svg>
        </>
      )}
    </p>
  );
}
