import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { gsap, SplitText } from '../utils/gsapSetup';
import { KINETIC_PHRASES } from '../utils/kineticPhrases';
import { PHRASE_WINDOWS } from '../utils/scrollHeroLogic';

export interface KineticIntroHandle {
  setProgress: (progress: number) => void;
}

interface KineticIntroProps {
  activeIndex: number;
  isVisible: boolean;
  onSelectPhrase: (index: number) => void;
}

export const KineticIntro = forwardRef<KineticIntroHandle, KineticIntroProps>(
  function KineticIntro({ activeIndex, isVisible, onSelectPhrase }, ref) {
    const stageRef = useRef<HTMLDivElement | null>(null);
    const slotRefs = useRef<(HTMLParagraphElement | null)[]>([]);
    const splitInstancesRef = useRef<(SplitText | null)[]>([]);
    const masterTlRef = useRef<gsap.core.Timeline | null>(null);
    const reducedMotionRef = useRef(false);
    const lastProgressRef = useRef(0);

    const applyMaskAndVisibilityForProgress = (p: number) => {
      const reducedMotion = reducedMotionRef.current;

      PHRASE_WINDOWS.forEach((w, idx) => {
        const el = slotRefs.current[idx];
        if (!el) return;

        if (reducedMotion) {
          const active =
            p >= w.enterStart && (w.exitEnd === null || p < w.exitEnd);
          const fallbackLast = idx === PHRASE_WINDOWS.length - 1 && p >= w.enterStart;
          const fallbackFirst = idx === 0 && p < PHRASE_WINDOWS[0].enterStart;
          const show = active || fallbackLast || fallbackFirst;
          el.style.opacity = show ? '1' : '0';
          el.style.visibility = show ? 'visible' : 'hidden';
          el.style.maskImage = 'none';
          el.style.webkitMaskImage = 'none';
          return;
        }

        const inRange =
          p >= w.enterStart && (w.exitEnd === null || p <= w.exitEnd);

        if (!inRange) {
          el.style.maskImage = 'none';
          el.style.webkitMaskImage = 'none';
          return;
        }

        if (p <= w.enterEnd) {
          const t = Math.max(
            0,
            Math.min(1, (p - w.enterStart) / (w.enterEnd - w.enterStart))
          );
          const s = -10 + t * 145;
          const mask =
            s >= 134
              ? 'none'
              : `linear-gradient(90deg, #000 ${s - 34}%, rgba(0,0,0,0.48) ${s - 15}%, transparent ${s}%)`;
          el.style.maskImage = mask;
          el.style.webkitMaskImage = mask;
        } else if (
          w.exitStart !== null &&
          w.exitEnd !== null &&
          p >= w.exitStart
        ) {
          const t = Math.max(
            0,
            Math.min(1, (p - w.exitStart) / (w.exitEnd - w.exitStart))
          );
          const s = -35 + t * 165;
          const mask =
            s <= -34
              ? 'none'
              : `linear-gradient(90deg, transparent ${s - 30}%, rgba(0,0,0,0.45) ${s - 12}%, #000 ${s + 8}%)`;
          el.style.maskImage = mask;
          el.style.webkitMaskImage = mask;
        } else {
          el.style.maskImage = 'none';
          el.style.webkitMaskImage = 'none';
        }
      });
    };

    useImperativeHandle(
      ref,
      () => ({
        setProgress: (rawProgress: number) => {
          const p = Math.max(0, Math.min(1, rawProgress));
          lastProgressRef.current = p;

          if (masterTlRef.current && !reducedMotionRef.current) {
            masterTlRef.current.progress(p);
          }
          applyMaskAndVisibilityForProgress(p);
        },
      }),
      []
    );

    useLayoutEffect(() => {
      const stageEl = stageRef.current;
      if (!stageEl) return;

      const reducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      reducedMotionRef.current = reducedMotion;

      if (reducedMotion) {
        gsap.set(stageEl, { autoAlpha: 1, y: 0 });
        applyMaskAndVisibilityForProgress(lastProgressRef.current);
        return;
      }

      const tl = gsap.timeline({ paused: true });
      masterTlRef.current = tl;

      // Full 0..1 timeline anchor so sub-range animations stay synchronized to scroll progress
      tl.to({}, { duration: 1 }, 0);

      // Smoothly reveal the intro shell just as the portrait completes settling (0.20 -> 0.25)
      tl.fromTo(
        stageEl,
        { autoAlpha: 0, y: 14 },
        { autoAlpha: 1, y: 0, duration: 0.05, ease: 'power2.out' },
        0.2
      );

      PHRASE_WINDOWS.forEach((w, idx) => {
        const el = slotRefs.current[idx];
        if (!el) return;

        gsap.set(el, {
          autoAlpha: 0,
          y: 0,
          maskImage: 'none',
          WebkitMaskImage: 'none',
        });

        const split = SplitText.create(el, { type: 'words,chars' });
        splitInstancesRef.current[idx] = split;
        const chars = split.chars ?? [];

        const enterDur = w.enterEnd - w.enterStart;
        const charEnterDur = enterDur * 0.55;
        const charEnterStagger = enterDur * 0.45;

        tl.fromTo(
          el,
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: 0.002, ease: 'none' },
          w.enterStart
        );

        tl.fromTo(
          chars,
          { opacity: 0, y: 12, color: '#FFFFFF' },
          {
            keyframes: [
              {
                opacity: 1,
                y: 0,
                color: '#FFFFFF',
                duration: charEnterDur * 0.34,
                ease: 'power1.out',
              },
              {
                color: '#7D8185',
                duration: charEnterDur * 0.33,
                ease: 'none',
              },
              {
                color: '#14191A',
                duration: charEnterDur * 0.33,
                ease: 'power1.out',
              },
            ],
            stagger: { amount: charEnterStagger, from: 'start' },
          },
          w.enterStart
        );

        if (w.exitStart !== null && w.exitEnd !== null) {
          const exitDur = w.exitEnd - w.exitStart;
          const charExitDur = exitDur * 0.55;
          const charExitStagger = exitDur * 0.45;

          tl.to(
            chars,
            {
              keyframes: [
                {
                  color: '#FFFFFF',
                  duration: charExitDur * 0.3,
                  ease: 'power1.out',
                },
                {
                  color: '#787C80',
                  duration: charExitDur * 0.35,
                  ease: 'none',
                },
                {
                  color: '#B4B7B5',
                  opacity: 0,
                  y: -10,
                  duration: charExitDur * 0.35,
                  ease: 'power1.in',
                },
              ],
              stagger: { amount: charExitStagger, from: 'start' },
            },
            w.exitStart
          );

          tl.to(
            el,
            { autoAlpha: 0, duration: 0.002, ease: 'none' },
            w.exitEnd - 0.002
          );
        }
      });

      tl.progress(lastProgressRef.current);
      applyMaskAndVisibilityForProgress(lastProgressRef.current);

      return () => {
        tl.kill();
        masterTlRef.current = null;
        splitInstancesRef.current.forEach((s) => s?.revert());
        splitInstancesRef.current = [];
      };
    }, []);

    const handleTabListKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (!isVisible) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const next = Math.min(KINETIC_PHRASES.length - 1, activeIndex + 1);
        if (next !== activeIndex) onSelectPhrase(next);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prev = Math.max(0, activeIndex - 1);
        if (prev !== activeIndex) onSelectPhrase(prev);
      }
    };

    const activePhrase = KINETIC_PHRASES[activeIndex] ?? KINETIC_PHRASES[0];

    return (
      <div
        ref={stageRef}
        data-testid="kinetic-intro"
        data-active-index={activeIndex}
        data-visible={isVisible ? 'true' : 'false'}
        aria-hidden={!isVisible}
        className={`w-full flex flex-col justify-between ${
          isVisible ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        {/* Top index & scroll cue */}
        <div className="flex items-center gap-3 sm:gap-4 text-[11px] font-mono tracking-[0.14em] uppercase text-[#6D7270] mb-4 sm:mb-8 lg:mb-10">
          <span className="text-[rgb(218,72,24)] font-medium tabular-nums">
            {activePhrase.index} / 0{KINETIC_PHRASES.length}
          </span>
          <span aria-hidden="true" className="text-[#B8B5AA]">
            ·
          </span>
          <span>SCROLL OR SELECT TO SEQUENCE</span>
        </div>

        {/* Stacked kinetic phrase stage (fixed height prevents layout shift) */}
        <div
          aria-live="polite"
          className="relative w-full min-h-[110px] sm:min-h-[148px] md:min-h-[172px] lg:min-h-[250px] flex items-center"
        >
          {KINETIC_PHRASES.map((phrase, idx) => (
            <p
              key={phrase.id}
              ref={(el) => {
                slotRefs.current[idx] = el;
              }}
              aria-hidden={idx !== activeIndex}
              className="absolute inset-x-0 font-display text-[clamp(1.38rem,4.1vw,3.8rem)] font-bold leading-[1.06] tracking-[-0.03em] text-[#14191A] uppercase text-balance select-none"
            >
              {phrase.text}
            </p>
          ))}
        </div>

        {/* Clean unboxed step navigation + signature */}
        <div className="mt-4 sm:mt-8 lg:mt-12 space-y-3.5 sm:space-y-6">
          <div
            role="tablist"
            aria-label="Introduction phrases"
            onKeyDown={handleTabListKeyDown}
            className="flex flex-wrap items-center gap-4 sm:gap-6"
          >
            {KINETIC_PHRASES.map((phrase, idx) => {
              const isActive = idx === activeIndex;
              return (
                <button
                  key={phrase.id}
                  type="button"
                  role="tab"
                  tabIndex={isVisible ? 0 : -1}
                  aria-selected={isActive}
                  aria-label={`Phrase ${phrase.index}: ${phrase.text}`}
                  onClick={() => onSelectPhrase(idx)}
                  className={`font-mono text-[12px] tracking-[0.12em] tabular-nums pb-1.5 transition-colors duration-150 whitespace-nowrap shrink-0 border-b-2 min-h-[40px] flex items-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[rgb(218,72,24)] ${
                    isActive
                      ? 'text-[rgb(218,72,24)] border-[rgb(218,72,24)] font-semibold'
                      : 'text-[#6D7270] border-transparent hover:text-[rgb(218,72,24)]'
                  }`}
                >
                  {phrase.index}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3.5 text-[11px] font-medium tracking-[0.12em] uppercase text-[#6D7270]">
            <span
              className="inline-block w-5 h-[1px] bg-[#9FA3A1]"
              aria-hidden="true"
            />
            <span>WRITING CODE SINCE &apos;19</span>
          </div>
        </div>
      </div>
    );
  }
);
