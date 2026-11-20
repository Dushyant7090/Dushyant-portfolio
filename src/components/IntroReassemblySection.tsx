import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import {
  INTRO_PARAGRAPH,
  computeLineRevealSchedule,
  computeWordScatterOffsets,
  getIntroPhase,
  isParagraphReassembled,
} from '../utils/wordScatter';

gsap.registerPlugin(ScrollTrigger, SplitText);

export function IntroReassemblySection() {
  const trackRef = useRef<HTMLElement | null>(null);
  const paragraphRef = useRef<HTMLParagraphElement | null>(null);
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
    if (!trackEl || !paragraphEl) return;

    if (reducedMotion) {
      trackEl.dataset.scrollProgress = '1.000';
      trackEl.dataset.reassembled = 'true';
      trackEl.dataset.introPhase = 'assembled';
      return;
    }

    let ctx: gsap.Context | null = null;
    let activeSplit: SplitText | null = null;

    const setupReassembly = () => {
      activeSplit?.revert();
      activeSplit = null;
      ctx?.revert();

      ctx = gsap.context(() => {
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
            end: 'bottom bottom',
            scrub: 1.35,
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

        // Anchor 0..1 duration covering entrance (0..0.46), calm reading hold (0.46..0.54), and bottom-up exit (0.54..0.96)
        tl.to({}, { duration: 1 }, 0);

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
            // Line 1 appears immediately after leaving the hero section, subtly scattered horizontally
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
            // Subsequent lines start hidden and rise in one by one as user scrolls
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

          // Act II: Graceful top-down disappearance (top line lifts and dissolves first, progressing downward)
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
        reducedMotion ? 'py-20 sm:py-28 lg:py-32' : 'h-[460vh] sm:h-[540vh] lg:h-[620vh]'
      }`}
    >
      <div
        className={
          reducedMotion
            ? 'w-full'
            : 'sticky top-0 h-dvh w-full pt-[72px] sm:pt-[88px] lg:pt-[96px] flex items-center justify-center overflow-x-clip'
        }
      >
        <div className="w-full max-w-[980px] mx-auto px-5 sm:px-8 md:px-12 text-center flex flex-col items-center">
          <p
            ref={paragraphRef}
            data-testid="intro-reassembly-paragraph"
            className="font-display text-[clamp(1.02rem,2.15vw,1.95rem)] font-medium leading-[1.52] sm:leading-[1.54] tracking-[-0.005em] [word-spacing:0.04em] text-[#14191A] max-w-[940px] mx-auto text-center"
          >
            {INTRO_PARAGRAPH}
          </p>
        </div>
      </div>
    </section>
  );
}
