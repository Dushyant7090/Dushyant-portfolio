import type { WorkProject } from '../data/work';

function FraudDetectionPreview() {
  return (
    <div className="w-full h-full bg-gradient-to-br from-[#FAF8FC] via-[#F6F1FA] to-[#EDE5F5] p-3 sm:p-3.5 flex flex-col justify-between text-[#111315] select-none">
      {/* Mini app top bar */}
      <div className="flex items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-5 h-5 rounded-md bg-[#6A0DAD] text-white inline-flex items-center justify-center shrink-0 shadow-[0_2px_6px_rgba(106,13,173,0.28)]">
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M8 1.5L2.5 3.8V7.6C2.5 11.1 4.9 14.1 8 15C11.1 14.1 13.5 11.1 13.5 7.6V3.8L8 1.5Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="font-display text-[11px] sm:text-[11.5px] font-semibold tracking-[-0.015em] text-[#111315] truncate">
            Fraud Detection Analytics
          </span>
        </div>

        <span className="inline-flex items-center gap-1 rounded-md bg-[#DCFCE7] border border-[#16A34A]/20 px-2 py-0.5 text-[9.5px] font-medium text-[#166534] tabular-nums shrink-0">
          <span className="text-[#15803D]/80">Model Accuracy</span>
          <strong className="font-bold">91.5%</strong>
        </span>
      </div>

      {/* Two side-by-side analytics panels */}
      <div className="grid grid-cols-12 gap-2.5 flex-1 min-h-0">
        {/* Left: Transaction Analysis Time-Series */}
        <div className="col-span-7 rounded-lg bg-white/95 border border-black/[0.06] p-2.5 flex flex-col gap-1.5 shadow-[0_2px_8px_rgba(17,19,21,0.03)]">
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
            <span className="text-[9.5px] font-semibold tracking-[-0.01em] text-[#111315] whitespace-nowrap">
              Transaction Analysis
            </span>
            <div className="flex items-center gap-2 text-[8px] text-[#14191A]/65 shrink-0">
              <span className="inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6A0DAD]" />
                Normal
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
                Fraudulent
              </span>
            </div>
          </div>

          <div className="flex-1 min-h-[108px] flex items-center">
            <svg
              viewBox="0 0 256 112"
              className="w-full h-full overflow-visible"
              preserveAspectRatio="xMidYMid meet"
              aria-hidden="true"
            >
              {[12, 34, 56, 78, 100].map((y, idx) => (
                <g key={y}>
                  <line
                    x1="24"
                    y1={y}
                    x2="248"
                    y2={y}
                    stroke="rgba(20,25,26,0.08)"
                    strokeWidth="0.85"
                  />
                  <text
                    x="19"
                    y={y + 2.5}
                    textAnchor="end"
                    fontSize="6.8"
                    fill="rgba(20,25,26,0.48)"
                    fontFamily="monospace"
                  >
                    {['1.00', '0.75', '0.50', '0.25', '0.00'][idx]}
                  </text>
                </g>
              ))}

              <polyline
                fill="none"
                stroke="#6A0DAD"
                strokeWidth="1.5"
                strokeLinejoin="round"
                points="26,76 48,58 70,74 92,48 114,43 136,56 158,39 180,49 202,29 224,36 246,20"
              />
              <polyline
                fill="none"
                stroke="#DC2626"
                strokeWidth="1.45"
                strokeLinejoin="round"
                points="26,38 48,66 70,84 92,62 114,70 136,49 158,60 180,43 202,62 224,28 246,35"
              />

              {'26,76 48,58 70,74 92,48 114,43 136,56 158,39 180,49 202,29 224,36 246,20'
                .split(' ')
                .map((pt) => {
                  const [cx, cy] = pt.split(',');
                  return <circle key={`n-${pt}`} cx={cx} cy={cy} r="2.1" fill="#6A0DAD" />;
                })}
              {'26,38 48,66 70,84 92,62 114,70 136,49 158,60 180,43 202,62 224,28 246,35'
                .split(' ')
                .map((pt) => {
                  const [cx, cy] = pt.split(',');
                  return <circle key={`f-${pt}`} cx={cx} cy={cy} r="2.0" fill="#DC2626" />;
                })}
            </svg>
          </div>
        </div>

        {/* Right: 2x2 Confusion Matrix Heatmap */}
        <div className="col-span-5 rounded-lg bg-white/95 border border-black/[0.06] p-2.5 flex flex-col justify-between shadow-[0_2px_8px_rgba(17,19,21,0.03)]">
          <span className="text-[9.5px] font-semibold tracking-[-0.01em] text-[#111315]">
            Confusion Matrix
          </span>

          <div className="flex items-stretch gap-1.5 flex-1 pt-2">
            <div className="grid grid-cols-2 grid-rows-2 gap-1.5 flex-1 font-mono text-[9.5px] font-semibold tabular-nums">
              <div className="rounded bg-[#6A0DAD] text-white flex items-center justify-center">
                8120
              </div>
              <div className="rounded bg-[#EFE4FA] text-[#4C0680] flex items-center justify-center">
                640
              </div>
              <div className="rounded bg-[#F5F2F8] text-[#3F354C] flex items-center justify-center">
                410
              </div>
              <div className="rounded bg-[#CFA9F0] text-[#4C0680] flex items-center justify-center">
                2760
              </div>
            </div>

            <div
              className="w-1.5 rounded-full bg-gradient-to-b from-[#6A0DAD] via-[#A86EE0] to-[#F5EFFB]"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function TradeWisePreview() {
  const candles = [
    { x: 18, o: 68, c: 58, h: 52, l: 74, up: true },
    { x: 34, o: 58, c: 63, h: 54, l: 69, up: false },
    { x: 50, o: 64, c: 50, h: 45, l: 68, up: true },
    { x: 66, o: 51, c: 57, h: 48, l: 62, up: false },
    { x: 82, o: 56, c: 44, h: 39, l: 60, up: true },
    { x: 98, o: 45, c: 36, h: 31, l: 49, up: true },
    { x: 114, o: 37, c: 44, h: 34, l: 49, up: false },
    { x: 130, o: 44, c: 32, h: 27, l: 47, up: true },
    { x: 146, o: 31, c: 25, h: 20, l: 36, up: true },
    { x: 162, o: 26, c: 32, h: 23, l: 37, up: false },
    { x: 178, o: 31, c: 19, h: 14, l: 35, up: true },
    { x: 194, o: 20, c: 13, h: 8, l: 25, up: true },
  ];

  return (
    <div className="w-full h-full bg-gradient-to-br from-[#0F171E] via-[#131E27] to-[#0A1015] p-3.5 sm:p-4 flex flex-col justify-between text-white select-none relative overflow-hidden">
      {/* Subtle dark emerald radial ambient */}
      <div
        className="pointer-events-none absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-[#10B981]/10 blur-2xl"
        aria-hidden="true"
      />

      {/* Mini platform header */}
      <div className="relative z-10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="2" y="8" width="2.5" height="6" rx="0.6" fill="#10B981" />
            <rect x="6.5" y="5" width="2.5" height="9" rx="0.6" fill="#10B981" />
            <rect x="11" y="2" width="2.5" height="12" rx="0.6" fill="#34D399" />
          </svg>
          <span className="font-display text-[11px] font-semibold tracking-tight text-white">
            TradeWise
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-2.5 text-[8.5px] text-white/60">
          <span>Home</span>
          <span>Insights</span>
          <span>Learn</span>
          <span>Community</span>
          <span className="w-4 h-4 rounded-full bg-white/15 border border-white/20 inline-block" />
        </div>
      </div>

      {/* Main split body */}
      <div className="relative z-10 grid grid-cols-12 gap-2 items-end pt-2 flex-1">
        <div className="col-span-6 space-y-2 pb-0.5">
          <p className="font-display text-[15px] sm:text-[17px] font-bold leading-[1.12] tracking-[-0.025em] text-white">
            Learn. Analyze.
            <br />
            Trade Better.
          </p>
          <p className="text-[8.5px] leading-[1.4] text-white/60">
            Verified insights. Real analysis. No noise.
          </p>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-[#16A34A] px-2.5 py-1 text-[8.5px] font-semibold text-white shadow-[0_4px_12px_rgba(22,163,74,0.3)]">
            <span>Explore Insights</span>
            <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path
                d="M2.5 6H9.5M9.5 6L6.5 3M9.5 6L6.5 9"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>

        {/* Candlestick SVG chart */}
        <div className="col-span-6 h-[92px] sm:h-[104px] flex items-end">
          <svg viewBox="0 0 210 86" className="w-full h-full overflow-visible" aria-hidden="true">
            {[16, 34, 52, 70].map((y) => (
              <line
                key={y}
                x1="6"
                y1={y}
                x2="206"
                y2={y}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="0.7"
              />
            ))}
            {[36, 76, 116, 156, 196].map((x) => (
              <line
                key={x}
                x1={x}
                y1="6"
                x2={x}
                y2="80"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="0.7"
              />
            ))}

            {candles.map((c) => {
              const color = c.up ? '#10B981' : '#EF4444';
              const top = Math.min(c.o, c.c);
              const height = Math.max(4, Math.abs(c.o - c.c));
              return (
                <g key={c.x}>
                  <line x1={c.x} y1={c.h} x2={c.x} y2={c.l} stroke={color} strokeWidth="1.2" />
                  <rect
                    x={c.x - 3.2}
                    y={top}
                    width="6.4"
                    height={height}
                    rx="1"
                    fill={color}
                  />
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}

function OmegaUpPreview() {
  return (
    <div className="w-full h-full bg-gradient-to-br from-[#FFFFFF] via-[#FAF7FC] to-[#F1E8FA] p-4 sm:p-5 flex flex-col justify-center relative overflow-hidden select-none">
      {/* Subtle diagonal violet geometric ribbons */}
      <div
        className="pointer-events-none absolute -right-10 -top-6 w-40 h-20 -rotate-35 rounded-2xl bg-gradient-to-r from-[#6A0DAD]/16 to-[#9D50DD]/8"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-6 bottom-3 w-36 h-16 -rotate-35 rounded-2xl bg-gradient-to-r from-[#6A0DAD]/20 to-[#6A0DAD]/5"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute right-14 -bottom-4 w-16 h-6 rounded-t-lg bg-[#6A0DAD]"
        aria-hidden="true"
      />

      {/* Dotted micro-grid decoration */}
      <svg
        width="58"
        height="34"
        viewBox="0 0 58 34"
        className="pointer-events-none absolute right-5 bottom-3 opacity-30"
        aria-hidden="true"
      >
        {[0, 1, 2].map((r) =>
          [0, 1, 2, 3, 4].map((c) => (
            <circle key={`${r}-${c}`} cx={6 + c * 11} cy={6 + r * 10} r="1.4" fill="#6A0DAD" />
          )),
        )}
      </svg>

      {/* Brand lockup */}
      <div className="relative z-10 space-y-2.5">
        <div className="flex items-center gap-3">
          <svg
            width="36"
            height="34"
            viewBox="0 0 40 38"
            fill="none"
            className="shrink-0"
            aria-hidden="true"
          >
            <path
              d="M12.5 31H4.5V25.5H10.2C7.3 22.8 5.5 19.1 5.5 14.9C5.5 7.4 11.9 2 20 2C28.1 2 34.5 7.4 34.5 14.9C34.5 19.1 32.7 22.8 29.8 25.5H35.5V31H27.5L24.8 25.8C27.2 23.6 28.6 20.1 28.6 15.6C28.6 10.4 25 7 20 7C15 7 11.4 10.4 11.4 15.6C11.4 20.1 12.8 23.6 15.2 25.8L12.5 31Z"
              fill="#6A0DAD"
            />
          </svg>
          <span className="font-display text-[26px] sm:text-[30px] font-bold tracking-[-0.03em] text-[#111315]">
            omegaUp
          </span>
        </div>

        <p className="text-[12.5px] sm:text-[13.5px] leading-[1.35] text-[#14191A]/70 max-w-[24ch]">
          Competitive Programming for Everyone
        </p>
      </div>
    </div>
  );
}

export function WorkProjectPreview({ projectId }: { projectId: WorkProject['id'] }) {
  switch (projectId) {
    case 'financial-fraud-detection':
      return <FraudDetectionPreview />;
    case 'tradewise':
      return <TradeWisePreview />;
    case 'omegaup':
      return <OmegaUpPreview />;
  }
}
