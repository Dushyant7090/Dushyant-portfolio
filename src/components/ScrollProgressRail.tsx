import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PORTFOLIO_SECTIONS,
  buildRailTicks,
  computePageScrollProgress,
  computeSectionRailStops,
  resolveActiveSectionIndex,
  stepRailProgress,
} from '../utils/scrollProgressRail';

const DEFAULT_STOPS = [0, 0.4, 0.7, 0.92, 1];

export function ScrollProgressRail() {
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [sectionStops, setSectionStops] = useState<number[]>(DEFAULT_STOPS);
  const [displayProgressPct, setDisplayProgressPct] = useState(0);

  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const mobileBarRef = useRef<HTMLDivElement | null>(null);
  const indicatorGroupRef = useRef<HTMLDivElement | null>(null);
  const tickRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const sectionTopsRef = useRef<number[]>([0, 1, 2, 3, 4]);
  const targetProgressRef = useRef(0);
  const currentProgressRef = useRef(0);
  const activeSectionRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const reducedMotionRef = useRef(false);
  const lastPctReportedRef = useRef(0);

  const ticks = useMemo(() => buildRailTicks(sectionStops, 0.125), [sectionStops]);
  const ticksRef = useRef(ticks);
  ticksRef.current = ticks;

  const paintProgressToDom = useCallback((progress: number) => {
    const pct = progress * 100;
    const roundedPct = Math.round(pct);
    if (roundedPct !== lastPctReportedRef.current) {
      lastPctReportedRef.current = roundedPct;
      setDisplayProgressPct(roundedPct);
    }

    if (activeLineRef.current) {
      activeLineRef.current.style.transform = `scaleY(${progress.toFixed(4)})`;
    }
    if (mobileBarRef.current) {
      mobileBarRef.current.style.transform = `scaleX(${progress.toFixed(4)})`;
    }
    if (indicatorGroupRef.current) {
      indicatorGroupRef.current.style.top = `${pct.toFixed(3)}%`;
    }

    const currentTicks = ticksRef.current;
    const currentSection = activeSectionRef.current;
    for (let i = 0; i < currentTicks.length; i++) {
      const el = tickRefs.current[i];
      if (!el) continue;
      const tick = currentTicks[i];
      const isHighlighted = tick.sectionIndex === currentSection;
      const isPassed = tick.position <= progress + 0.004;

      if (isHighlighted || isPassed) {
        el.style.backgroundColor = '#6A0DAD';
      } else {
        el.style.backgroundColor = '#C8C5BD';
      }

      if (isHighlighted) {
        el.style.width = '12px';
        el.style.height = '2px';
      } else {
        el.style.width = '7px';
        el.style.height = '1.5px';
      }
    }
  }, []);

  const ensureAnimationLoop = useCallback(() => {
    if (reducedMotionRef.current) {
      currentProgressRef.current = targetProgressRef.current;
      paintProgressToDom(currentProgressRef.current);
      return;
    }
    if (rafRef.current !== null) return;

    lastTimeRef.current = null;
    const tick = (now: number) => {
      const prev = lastTimeRef.current ?? now;
      const dt = (now - prev) / 1000;
      lastTimeRef.current = now;

      const next = stepRailProgress(
        currentProgressRef.current,
        targetProgressRef.current,
        dt,
        18,
      );
      currentProgressRef.current = next;
      paintProgressToDom(next);

      if (Math.abs(targetProgressRef.current - next) > 0.0004) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        currentProgressRef.current = targetProgressRef.current;
        paintProgressToDom(targetProgressRef.current);
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [paintProgressToDom]);

  const measureDocument = useCallback(() => {
    const scrollHeight = document.documentElement.scrollHeight;
    const viewportHeight = window.innerHeight;

    const tops = PORTFOLIO_SECTIONS.map((sec, idx) => {
      if (idx === 0) return 0;
      const el = document.getElementById(sec.id);
      return el ? el.offsetTop : idx * viewportHeight;
    });
    sectionTopsRef.current = tops;

    const nextStops = computeSectionRailStops(tops, scrollHeight, viewportHeight);
    setSectionStops((prev) => {
      if (
        prev.length === nextStops.length &&
        prev.every((val, i) => Math.abs(val - nextStops[i]) < 0.004)
      ) {
        return prev;
      }
      return nextStops;
    });

    const scrollY = window.scrollY;
    targetProgressRef.current = computePageScrollProgress(scrollY, scrollHeight, viewportHeight);

    const nextActive = resolveActiveSectionIndex(
      scrollY,
      viewportHeight,
      scrollHeight,
      tops,
    );
    if (nextActive !== activeSectionRef.current) {
      activeSectionRef.current = nextActive;
      setActiveSectionIndex(nextActive);
    }

    ensureAnimationLoop();
  }, [ensureAnimationLoop]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionRef.current = mq.matches;
    const onMotionChange = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
      ensureAnimationLoop();
    };
    mq.addEventListener('change', onMotionChange);

    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight;
      const viewportHeight = window.innerHeight;
      const scrollY = window.scrollY;

      targetProgressRef.current = computePageScrollProgress(
        scrollY,
        scrollHeight,
        viewportHeight,
      );

      const nextActive = resolveActiveSectionIndex(
        scrollY,
        viewportHeight,
        scrollHeight,
        sectionTopsRef.current,
      );
      if (nextActive !== activeSectionRef.current) {
        activeSectionRef.current = nextActive;
        setActiveSectionIndex(nextActive);
      }

      ensureAnimationLoop();
    };

    // Initial sync & deferred re-measurement after ScrollTrigger pins settle
    measureDocument();
    currentProgressRef.current = targetProgressRef.current;
    paintProgressToDom(currentProgressRef.current);

    const settleTimer1 = window.setTimeout(measureDocument, 240);
    const settleTimer2 = window.setTimeout(measureDocument, 750);

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', measureDocument);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        measureDocument();
      });
      resizeObserver.observe(document.body);
    }

    return () => {
      window.clearTimeout(settleTimer1);
      window.clearTimeout(settleTimer2);
      mq.removeEventListener('change', onMotionChange);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', measureDocument);
      resizeObserver?.disconnect();
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [ensureAnimationLoop, measureDocument, paintProgressToDom]);

  // Repaint tick styling cleanly whenever activeSectionIndex or ticks array updates
  useEffect(() => {
    paintProgressToDom(currentProgressRef.current);
  }, [activeSectionIndex, ticks, paintProgressToDom]);

  const activeSection = PORTFOLIO_SECTIONS[activeSectionIndex] ?? PORTFOLIO_SECTIONS[0];

  return (
    <>
      {/* Desktop fixed right-edge vertical scroll progress rail */}
      <aside
        aria-label="Scroll progress"
        data-testid="scroll-progress-rail"
        data-active-section={activeSection.id}
        data-section-number={activeSection.number}
        data-section-label={activeSection.label}
        data-progress={displayProgressPct}
        className="hidden lg:flex fixed right-4 xl:right-6 top-1/2 -translate-y-1/2 z-30 pointer-events-none select-none items-center"
      >
        <div
          role="progressbar"
          aria-label="Page scroll progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={displayProgressPct}
          aria-valuetext={`${activeSection.number} / ${activeSection.label}`}
          className="relative h-[46vh] min-h-[260px] max-h-[420px] w-[144px]"
        >
          {/* Inactive grey vertical track */}
          <div
            aria-hidden="true"
            className="absolute right-[4px] top-0 bottom-0 w-[1.5px] bg-[#C8C5BD]"
          />

          {/* Active deep purple vertical progress line */}
          <div
            ref={activeLineRef}
            aria-hidden="true"
            style={{ transform: 'scaleY(0)' }}
            className="absolute right-[4px] top-0 bottom-0 w-[1.5px] bg-[#6A0DAD] origin-top will-change-transform"
          />

          {/* Horizontal tick marks along the left side of the track */}
          {ticks.map((tick, idx) => (
            <span
              key={tick.id}
              ref={(el) => {
                tickRefs.current[idx] = el;
              }}
              aria-hidden="true"
              data-testid={tick.sectionIndex !== null ? `rail-tick-${tick.sectionIndex}` : undefined}
              data-active-tick={tick.sectionIndex === activeSectionIndex ? 'true' : 'false'}
              style={{
                top: `${(tick.position * 100).toFixed(3)}%`,
                width: tick.sectionIndex === activeSectionIndex ? '12px' : '7px',
                height: tick.sectionIndex === activeSectionIndex ? '2px' : '1.5px',
                backgroundColor: tick.sectionIndex === activeSectionIndex ? '#6A0DAD' : '#C8C5BD',
              }}
              className="absolute right-[5px] -translate-y-1/2 transition-[width,height,background-color] duration-200 ease-out"
            />
          ))}

          {/* Moving circular indicator + dynamic section readout */}
          <div
            ref={indicatorGroupRef}
            style={{ top: '0%' }}
            className="absolute inset-x-0 -translate-y-1/2 flex items-center justify-end"
          >
            {/* Compact uppercase section number & label beside the dot */}
            <div className="mr-[20px] text-right leading-none">
              <span className="block font-mono text-[10px] font-medium tracking-[0.14em] tabular-nums text-[#1A1A1A]/65">
                {activeSection.number}
              </span>
              <span className="mt-[3px] block font-display text-[10px] font-bold tracking-[0.16em] uppercase text-[#1A1A1A] whitespace-nowrap">
                {activeSection.label}
              </span>
            </div>

            {/* Small circular scroll indicator */}
            <span
              aria-hidden="true"
              data-testid="scroll-progress-dot"
              className="w-[8px] h-[8px] rounded-full bg-[#6A0DAD] ring-2 ring-[#ECEAE2] shrink-0 mr-[0.75px]"
            />
          </div>
        </div>
      </aside>

      {/* Mobile / tablet compact minimal bottom scroll hairline */}
      <div
        aria-hidden="true"
        data-testid="scroll-progress-mobile"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 h-[2px] bg-[#C8C5BD]/65 pointer-events-none"
      >
        <div
          ref={mobileBarRef}
          style={{ transform: 'scaleX(0)' }}
          className="h-full w-full bg-[#6A0DAD] origin-left will-change-transform"
        />
      </div>
    </>
  );
}
