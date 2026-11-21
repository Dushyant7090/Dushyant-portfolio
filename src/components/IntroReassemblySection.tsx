import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap, ScrollTrigger, SplitText } from '../utils/gsapSetup';
import {
  EXIT_START_PROGRESS,
  INTRO_PARAGRAPH,
  computeLineRevealSchedule,
  computeWordScatterOffsets,
  getIntroPhase,
  isParagraphReassembled,
} from '../utils/wordScatter';

export function IntroReassemblySection() {
  const trackRef = useRef<HTMLElement | null>(null);
  const paragraphRef = useRef<HTMLParagraphElement | null>(null);
  const headingEnterRef = useRef<HTMLDivElement | null>(null);
  const headingExitRef = useRef<HTMLDivElement | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);

    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useLayoutEffect(() => {
    const trackEl = trackRef.current;
    const paragraphEl = paragraphRef.current;
    const headingEnterEl = headingEnterRef.current;
    const headingExitEl = headingExitRef.current;
    if (!trackEl || !paragraphEl) return;

    if (reducedMotion) {
      trackEl.dataset.scrollProgress = '1.000';
      trackEl.dataset.reassembled = 'true';
      trackEl.dataset.introPhase = 'assembled';
      if (headingEnterEl) gsap.set(headingEnterEl, { opacity: 1, y: 0 });
      if (headingExitEl) gsap.set(headingExitEl, { opacity: 1, y: 0 });
      return;
    }

    let ctx: gsap.Context | null = null;
    let activeSplit: SplitText | null = null;

    const setupReassembly = () => {
      activeSplit?.revert();
      activeSplit = null;
      ctx?.revert();

      ctx = gsap.context(() => {
        if (headingEnterEl) {
          gsap.fromTo(
            headingEnterEl,
            { opacity: 0, y: 20 },
            {
              opacity: 1,
              y: 0,
              ease: 'power2.out',
              immediateRender: true,
              scrollTrigger: {
                trigger: trackEl,
                start: 'top 86%',
                end: 'top 34%',
                scrub: 1.0,
                invalidateOnRefresh: true,
              },
            }
          );
        }

        const split = SplitText.create(paragraphEl, {
          type: 'lines,words',
          tag: 'span',
          linesClass: 'intro-line block will-change-transform',
          wordsClass: 'intro-word inline-block will-change-transform',
        });
        activeSplit = split;

        const lines = split.lines ?? [];
        const words = split.words ?? [];
        if (lines.length === 0 || words.length === 0) return;

        const wordOffsets = computeWordScatterOffsets(
          words.length,
          window.innerWidth
        );
        const wordIndexMap = new Map<Element, number>();
        words.forEach((wordEl, idx) => wordIndexMap.set(wordEl, idx));

        const schedule = computeLineRevealSchedule(lines.length);

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: trackEl,
            start: 'top top',
            end: 'bottom 35%',
            scrub: 1.15,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const p = self.progress;
              trackEl.dataset.scrollProgress = p.toFixed(3);
              trackEl.dataset.introPhase = getIntroPhase(p);
              trackEl.dataset.reassembled = isParagraphReassembled(p)
                ? 'true'
                : 'false';
            },
          },
        });

        tl.to({}, { duration: 1 }, 0);

        if (headingExitEl) {
          const headingExitSpan = Math.max(
            0.08,
            (schedule[0]?.exitEnd ?? EXIT_START_PROGRESS + 0.08) - EXIT_START_PROGRESS + 0.03
          );
          tl.fromTo(
            headingExitEl,
            { opacity: 1, y: 0 },
            {
              opacity: 0,
              y: -16,
              ease: 'power2.inOut',
              duration: headingExitSpan,
              immediateRender: false,
            },
            EXIT_START_PROGRESS
          );
        }

        lines.forEach((lineEl, lineIdx) => {
          const win = schedule[lineIdx];
          if (!win) return;

          const lineWords = words.filter((w) => lineEl.contains(w));
          const getOffsetX = (_i: number, target: Element) => {
            const globalIdx = wordIndexMap.get(target) ?? 0;
            return wordOffsets[globalIdx]?.x ?? 0;
          };
          const getExitOffsetX = (_i: number, target: Element) => {
            const globalIdx = wordIndexMap.get(target) ?? 0;
            return Math.round(-(wordOffsets[globalIdx]?.x ?? 0) * 0.55);
          };

          if (win.initiallyVisible) {
            gsap.set(lineEl, { opacity: 1, y: 0 });
            gsap.set(lineWords, {
              x: getOffsetX,
              opacity: 0.78,
            });

            const span = Math.max(0.04, win.wordEnd - win.wordStart);
            const staggerSpan = lineWords.length > 1 ? span * 0.35 : 0;
            const tweenDur = Math.max(0.025, span - staggerSpan);

            tl.fromTo(
              lineWords,
              {
                x: getOffsetX,
                opacity: 0.78,
              },
              {
                x: 0,
                opacity: 1,
                ease: 'power2.out',
                duration: tweenDur,
                immediateRender: true,
                stagger: {
                  amount: staggerSpan,
                  from: 'start',
                },
              },
              win.wordStart
            );
          } else {
            gsap.set(lineEl, { opacity: 0, y: 22 });
            gsap.set(lineWords, {
              x: getOffsetX,
              opacity: 0.45,
            });

            const enterDur = Math.max(0.025, win.enterEnd - win.enterStart);
            tl.fromTo(
              lineEl,
              { opacity: 0, y: 22 },
              {
                opacity: 1,
                y: 0,
                ease: 'power2.out',
                duration: enterDur,
                immediateRender: true,
              },
              win.enterStart
            );

            const wordSpan = Math.max(0.03, win.wordEnd - win.wordStart);
            const staggerSpan = lineWords.length > 1 ? wordSpan * 0.35 : 0;
            const wordDur = Math.max(0.02, wordSpan - staggerSpan);

            tl.fromTo(
              lineWords,
              {
                x: getOffsetX,
                opacity: 0.45,
              },
              {
                x: 0,
                opacity: 1,
                ease: 'power3.out',
                duration: wordDur,
                immediateRender: true,
                stagger: {
                  amount: staggerSpan,
                  from: 'start',
                },
              },
              win.wordStart
            );
          }

          const exitSpan = Math.max(0.03, win.exitEnd - win.exitStart);
          const exitWordStagger = lineWords.length > 1 ? exitSpan * 0.34 : 0;
          const exitWordDur = Math.max(0.02, exitSpan - exitWordStagger);

          tl.fromTo(
            lineEl,
            { opacity: 1, y: 0 },
            {
              opacity: 0,
              y: -16,
              ease: 'power2.inOut',
              duration: exitSpan,
              immediateRender: false,
            },
            win.exitStart
          );

          tl.fromTo(
            lineWords,
            { x: 0, opacity: 1 },
            {
              x: getExitOffsetX,
              opacity: 0,
              ease: 'power2.in',
              duration: exitWordDur,
              immediateRender: false,
              stagger: {
                amount: exitWordStagger,
                from: 'start',
              },
            },
            win.exitStart
          );
        });
      }, trackRef);
    };

    setupReassembly();

    // Ensure re-measurement once webfonts finish loading on production hosts like Vercel
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        setupReassembly();
        ScrollTrigger.refresh();
      });
    }

    let lastWidth = window.innerWidth;
    const handleResize = () => {
      if (window.innerWidth !== lastWidth) {
        lastWidth = window.innerWidth;
        setupReassembly();
        ScrollTrigger.refresh();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      activeSplit?.revert();
      ctx?.revert();
    };
  }, [reducedMotion]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      ScrollTrigger.refresh();
    }, 180);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <section
      ref={trackRef}
      id="about"
      aria-label="About Dushyant Beniwal"
      data-testid="about-scroll-track"
      data-scroll-progress="0.000"
      data-intro-phase={reducedMotion ? 'assembled' : 'entering'}
      data-reassembled={reducedMotion ? 'true' : 'false'}
      className={`relative w-full bg-[#ECEAE2] border-t border-[#D6D3C8] ${
        reducedMotion ? 'py-20 sm:py-28 lg:py-32' : 'h-[330vh] sm:h-[370vh] lg:h-[410vh]'
      }`}
    >
      <div
        className={
          reducedMotion
            ? 'w-full'
            : 'sticky top-0 h-dvh w-full pt-[72px] sm:pt-[88px] lg:pt-[96px] flex items-center justify-center overflow-x-clip'
        }
      >
        <div className="w-full lg:w-[92%] lg:max-w-[1320px] mx-auto px-5 sm:px-8 md:px-12 lg:px-10">
          <div className="relative flex flex-col items-center">
            <div className="mb-4 sm:mb-5 lg:mb-0 lg:absolute lg:left-0 lg:top-0 lg:h-[calc(1.54*clamp(1.05rem,2.2vw,1.95rem))] lg:flex lg:items-center pointer-events-none">
              <div ref={headingEnterRef} className="will-change-[transform,opacity]">
                <div ref={headingExitRef} className="will-change-[transform,opacity]">
                  <h2
                    id="about-heading"
                    data-testid="about-heading"
                    className="font-display text-[11.5px] sm:text-[15px] md:text-[17px] lg:text-[19px] font-bold uppercase tracking-[0.015em] [word-spacing:0.14em] leading-[0.98] text-[#1A1A1A] text-center lg:text-left whitespace-nowrap select-none"
                  >
                    ABOUT ME
                  </h2>
                </div>
              </div>
            </div>

            <p
              ref={paragraphRef}
              data-testid="intro-reassembly-paragraph"
              className="font-display text-[clamp(1.05rem,2.2vw,1.95rem)] font-medium leading-[1.52] sm:leading-[1.54] tracking-[-0.005em] [word-spacing:0.04em] text-[#14191A] w-full max-w-[780px] lg:max-w-[600px] xl:max-w-[780px] mx-auto text-center [text-wrap:balance]"
            >
              {INTRO_PARAGRAPH}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
