import type { RefObject } from 'react';
import type { ToolkitCategory, ToolkitItem } from '../data/toolkit';

interface ToolkitFaceBoardProps {
  categories: readonly ToolkitCategory[];
  totalTools: number;
  totalDisciplines: number;
  isMobile: boolean;
  isBackface?: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
}

function ToolkitWordmarkSvg({ compact = false }: { compact?: boolean }) {
  return (
    <svg
      viewBox="0 0 338 48"
      className={compact ? 'block h-[22px] w-auto text-[#111315]' : 'block h-[30px] w-auto text-[#111315]'}
      fill="currentColor"
      aria-hidden="true"
    >
      {/* T */}
      <path d="M0 0H38V9H23.5V48H14.5V9H0V0Z" />
      {/* O */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M58 0H84L92 8V40L84 48H58L50 40V8L58 0ZM61 9L59 11V37L61 39H81L83 37V11L81 9H61Z"
      />
      {/* O */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M112 0H138L146 8V40L138 48H112L104 40V8L112 0ZM115 9L113 11V37L115 39H135L137 37V11L135 9H115Z"
      />
      {/* L */}
      <path d="M158 0H167V39H194V48H158V0Z" />
      {/* K */}
      <path d="M206 0H215V48H206V0ZM215 19.5L236 0H247.5L222.5 24L248 48H236L215 28.5V19.5Z" />
      {/* I */}
      <path d="M260 0H288V9H278.5V39H288V48H260V39H269.5V9H260V0Z" />
      {/* T */}
      <path d="M300 0H338V9H323.5V48H314.5V9H300V0Z" />
    </svg>
  );
}

function ToolkitPill({
  item,
  compact = false,
  interactive = true,
}: {
  item: ToolkitItem;
  compact?: boolean;
  interactive?: boolean;
}) {
  return (
    <li className="list-none">
      <div
        className={`group inline-flex items-center rounded-full bg-white/88 border border-black/[0.08] shadow-[0_1px_4px_rgba(17,19,21,0.06)] select-none ${
          compact ? 'gap-1.5 h-[26px] px-2.5' : 'gap-2 h-[33px] px-3'
        } ${
          interactive
            ? 'transition-all duration-150 ease-out hover:-translate-y-0.5 hover:bg-white hover:border-[#6A0DAD]/35 hover:shadow-[0_4px_12px_rgba(106,13,173,0.14)] motion-reduce:hover:translate-y-0'
            : ''
        }`}
      >
        <span
          className={`shrink-0 flex items-center justify-center rounded-full bg-white ${
            compact ? 'w-3.5 h-3.5' : 'w-4.5 h-4.5'
          }`}
        >
          <img
            src={item.icon}
            alt=""
            aria-hidden="true"
            className={compact ? 'w-3 h-3 object-contain' : 'w-3.5 h-3.5 object-contain'}
            loading="eager"
            decoding="async"
          />
        </span>

        <span
          className={`font-sans font-medium tracking-[-0.01em] text-[#14191A] whitespace-nowrap ${
            compact ? 'text-[10.5px]' : 'text-[12.5px]'
          }`}
        >
          {item.name}
        </span>
      </div>
    </li>
  );
}

function CategoryBlock({
  category,
  compact = false,
  isBackface = false,
}: {
  category: ToolkitCategory;
  compact?: boolean;
  isBackface?: boolean;
}) {
  const titleWithoutCode = category.title.replace(/^\d+\s*[—-]\s*/, '');

  return (
    <div>
      {isBackface ? (
        <p
          className={`font-mono font-medium uppercase tracking-[0.15em] text-[#14191A]/75 ${
            compact ? 'text-[8px] mb-1' : 'text-[10px] mb-1.5'
          }`}
        >
          <span className="text-[#111315] font-semibold">{category.code}</span>
          {' — '}
          {titleWithoutCode}
        </p>
      ) : (
        <h3
          className={`font-mono font-medium uppercase tracking-[0.15em] text-[#14191A]/75 ${
            compact ? 'text-[8px] mb-1' : 'text-[10px] mb-1.5'
          }`}
        >
          <span className="text-[#111315] font-semibold">{category.code}</span>
          {' — '}
          {titleWithoutCode}
        </h3>
      )}

      <ul
        aria-label={isBackface ? undefined : category.title}
        className={`flex flex-wrap m-0 p-0 ${
          compact ? 'gap-1.5' : 'gap-x-2 gap-y-2'
        }`}
      >
        {category.items.map((item) => (
          <ToolkitPill
            key={item.id}
            item={item}
            compact={compact}
            interactive={!isBackface}
          />
        ))}
      </ul>
    </div>
  );
}

export function ToolkitFaceBoard({
  categories,
  totalTools,
  totalDisciplines,
  isMobile,
  isBackface = false,
  containerRef,
}: ToolkitFaceBoardProps) {
  // Explicit editorial split matching:
  // Left: 01, 03, 05, 07 | Right: 02, 04, 06
  const leftColumnCategories = categories.filter((_, index) => index % 2 === 0);
  const rightColumnCategories = categories.filter((_, index) => index % 2 === 1);

  return (
    <div
      ref={containerRef}
      data-testid={isBackface ? 'toolkit-back-face-html' : 'toolkit-front-face-html'}
      aria-hidden={isBackface ? 'true' : undefined}
      style={{
        width: isMobile ? 356 : 960,
        height: isMobile ? 592 : 548,
      }}
      className={`select-none ${isBackface ? 'pointer-events-none' : ''}`}
    >
      <div
        className={`w-full h-full flex flex-col justify-between ${
          isBackface ? '-scale-x-100 opacity-90' : ''
        } ${isMobile ? 'px-4 py-4' : 'px-9 py-7'}`}
      >
        {/* Header Row */}
        <div
          className={`flex items-end justify-between gap-3 border-b border-black/[0.11] ${
            isMobile ? 'pb-2.5' : 'pb-4'
          }`}
        >
          {isBackface ? (
            <div aria-hidden="true">
              <ToolkitWordmarkSvg compact={isMobile} />
            </div>
          ) : (
            <h2 id="toolkit-heading" className="m-0">
              <span className="sr-only">TOOLKIT</span>
              <ToolkitWordmarkSvg compact={isMobile} />
            </h2>
          )}

          <p
            className={`font-mono font-medium uppercase tracking-[0.16em] text-[#14191A]/75 tabular-nums whitespace-nowrap ${
              isMobile ? 'text-[8.5px]' : 'text-[10.5px]'
            }`}
          >
            <span className="text-[#6A0DAD] font-semibold">{totalTools}</span> TOOLS ·{' '}
            <span className="text-[#6A0DAD] font-semibold">{totalDisciplines}</span> DISCIPLINES
          </p>
        </div>

        {/* Content Grid */}
        {isMobile ? (
          <div className="flex-1 flex flex-col justify-evenly pt-2">
            {categories.map((category) => (
              <CategoryBlock
                key={category.id}
                category={category}
                compact
                isBackface={isBackface}
              />
            ))}
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-2 gap-x-10 pt-5 items-start">
            <div className="flex flex-col gap-5">
              {leftColumnCategories.map((category) => (
                <CategoryBlock
                  key={category.id}
                  category={category}
                  isBackface={isBackface}
                />
              ))}
            </div>

            <div className="flex flex-col gap-6">
              {rightColumnCategories.map((category) => (
                <CategoryBlock
                  key={category.id}
                  category={category}
                  isBackface={isBackface}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
