import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { gsap, ScrollTrigger } from '../utils/gsapSetup';
import { AsciiPortrait } from './AsciiPortrait';
import { KineticIntro, type KineticIntroHandle } from './KineticIntro';
import {
  computeCenterOffset,
  computeEndHeroScale,
  computeEndOffset,
  computeInitialHeroScale,
  computeProgressiveStages,
  getPhraseIndexForProgress,
  getProgressForPhraseIndex,
  isIntroRevealed,
} from '../utils/scrollHeroLogic';

export function HeroSection() {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const stickyStageRef = useRef<HTMLDivElement | null>(null);
  const portraitMotionRef = useRef<HTMLDivElement | null>(null);
  const scrollCueRef = useRef<HTMLDivElement | null>(null);
  const kineticIntroRef = useRef<KineticIntroHandle | null>(null);

  const [introVisible, setIntroVisible] = useState(false);
  const [activePhraseIndex, setActivePhraseIndex] = useState(0);

  const introVisibleRef = useRef(false);
  const activePhraseRef = useRef(0);

  const syncStateFromProgress = useCallback(
    (progress: number, reducedMotion: boolean) => {
      const revealed = reducedMotion ? true : isIntroRevealed(progress);
      const nextPhrase = getPhraseIndexForProgress(progress);

      if (trackRef.current) {
        trackRef.current.dataset.scrollProgress = progress.toFixed(3);
      }

      if (revealed !== introVisibleRef.current) {
        introVisibleRef.current = revealed;
        setIntroVisible(revealed);
      }
      if (nextPhrase !== activePhraseRef.current) {
        activePhraseRef.current = nextPhrase;
        setActivePhraseIndex(nextPhrase);
      }
    },
    []
  );

  useLayoutEffect(() => {
    const trackEl = trackRef.current;
    const stickyStageEl = stickyStageRef.current;
    const portraitEl = portraitMotionRef.current;
    if (!trackEl || !stickyStageEl || !portraitEl) return;

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let ctx: gsap.Context | null = null;

    const setupScrollChoreography = () => {
      ctx?.revert();

      ctx = gsap.context(() => {
        // Measure resting position cleanly relative to the pinned sticky stage
        // so resizing while scrolled down to later sections stays exact.
        gsap.set(portraitEl, {
          x: 0,
          y: 0,
          scale: 1,
          transformOrigin: 'center center',
        });
        const stageRect = stickyStageEl.getBoundingClientRect();
        const rawRect = portraitEl.getBoundingClientRect();
        const restingRect = {
          left: rawRect.left - stageRect.left,
          top: rawRect.top - stageRect.top,
          width: rawRect.width,
          height: rawRect.height,
        };
        const isDesktop = window.innerWidth >= 1024;
        const endScale = computeEndHeroScale(window.innerWidth);
        const endOffset = computeEndOffset(
          restingRect.width,
          endScale,
          isDesktop
        );

        if (reducedMotion) {
          gsap.set(portraitEl, {
            x: endOffset.x,
            y: endOffset.y,
            scale: endScale,
            transformOrigin: 'center center',
          });
          if (scrollCueRef.current) {
            gsap.set(scrollCueRef.current, { autoAlpha: 0 });
          }
          ScrollTrigger.create({
            trigger: trackEl,
            start: 'top top',
            end: 'bottom bottom',
            onUpdate: (self) => {
              kineticIntroRef.current?.setProgress(self.progress);
              syncStateFromProgress(self.progress, true);
            },
          });
          kineticIntroRef.current?.setProgress(0);
          syncStateFromProgress(0, true);
          return;
        }

        const headerEl = document.querySelector('header');
        const headerHeight =
          headerEl?.getBoundingClientRect().height ??
          (window.innerWidth >= 640 ? 96 : 76);

        const viewport = {
          width: window.innerWidth,
          height: window.innerHeight,
          topReserve: headerHeight,
          bottomReserve: 44,
        };

        const centerOffset = computeCenterOffset(restingRect, viewport);
        const initialScale = computeInitialHeroScale(restingRect, viewport);
        const stages = computeProgressiveStages(
          centerOffset,
          initialScale,
          endScale,
          endOffset
        );

        const progressProxy = { p: 0 };

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: trackEl,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 1.4,
            invalidateOnRefresh: true,
          },
        });

        // Drive scrubbed progress continuously through smooth 1.4s inertial damping
        tl.to(
          progressProxy,
          {
            p: 1,
            duration: 1,
            ease: 'none',
            onUpdate: () => {
              kineticIntroRef.current?.setProgress(progressProxy.p);
              syncStateFromProgress(progressProxy.p, false);
            },
          },
          0
        );

        // Portrait begins large & viewport-centered, then shrinks through progressive size
        // transitions while moving smoothly toward the right column (0.00 -> 0.22)
        tl.fromTo(
          portraitEl,
          { x: stages.start.x, y: stages.start.y, scale: stages.start.scale },
          {
            x: stages.stage1.x,
            y: stages.stage1.y,
            scale: stages.stage1.scale,
            ease: 'power1.inOut',
            duration: 0.08,
          },
          0
        )
          .to(
            portraitEl,
            {
              x: stages.stage2.x,
              y: stages.stage2.y,
              scale: stages.stage2.scale,
              ease: 'power2.inOut',
              duration: 0.08,
            },
            0.08
          )
          .to(
            portraitEl,
            {
              x: stages.end.x,
              y: stages.end.y,
              scale: stages.end.scale,
              ease: 'power3.out',
              duration: 0.06,
            },
            0.16
          );

        // Scroll indicator fades out cleanly as portrait begins shrinking & shifting
        if (scrollCueRef.current) {
          tl.fromTo(
            scrollCueRef.current,
            { autoAlpha: 1, y: 0 },
            { autoAlpha: 0, y: 10, ease: 'power1.out', duration: 0.06 },
            0
          );
        }

        // Sync initial state on setup/resize
        const maxScroll = Math.max(
          1,
          trackEl.offsetHeight - window.innerHeight
        );
        const initialProgress = Math.max(
          0,
          Math.min(1, window.scrollY / maxScroll)
        );
        kineticIntroRef.current?.setProgress(initialProgress);
        syncStateFromProgress(initialProgress, false);
      }, trackRef);
    };

    setupScrollChoreography();

    const handleResize = () => {
      setupScrollChoreography();
      ScrollTrigger.refresh();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      ctx?.revert();
    };
  }, [syncStateFromProgress]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      ScrollTrigger.refresh();
    }, 150);
    return () => window.clearTimeout(id);
  }, []);

  const handleSelectPhrase = useCallback((phraseIndex: number) => {
    const trackEl = trackRef.current;
    if (!trackEl) return;

    const targetProgress = getProgressForPhraseIndex(phraseIndex);
    const maxScroll = Math.max(1, trackEl.offsetHeight - window.innerHeight);
    const targetY = trackEl.offsetTop + targetProgress * maxScroll;

    window.scrollTo({
      top: targetY,
      behavior: 'smooth',
    });
  }, []);

  return (
    <section
      ref={trackRef}
      id="top"
      aria-label="Introduction"
      data-testid="hero-scroll-track"
      data-scroll-progress="0.000"
      className="relative w-full h-[660vh] sm:h-[760vh] lg:h-[900vh] bg-[#ECEAE2]"
    >
      {/* Pinned hero stage */}
      <div
        ref={stickyStageRef}
        className="sticky top-0 h-dvh w-full pt-[72px] sm:pt-[88px] lg:pt-[96px] flex flex-col justify-center overflow-hidden"
      >
        <div className="w-full max-w-[1440px] mx-auto px-5 sm:px-8 md:px-12 lg:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-7 lg:gap-12 items-center">
            {/* Left Kinetic Typography Intro Column (scrubbed after portrait settles on right) */}
            <div className="lg:col-span-7 flex flex-col items-start">
              <KineticIntro
                ref={kineticIntroRef}
                activeIndex={activePhraseIndex}
                isVisible={introVisible}
                onSelectPhrase={handleSelectPhrase}
              />
            </div>

            {/* Right Portrait Column (starts large & viewport-centered, shrinks progressively to right) */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <div
                ref={portraitMotionRef}
                data-testid="hero-portrait-motion"
                className="w-full max-w-[min(272px,calc((100dvh-345px)*0.96))] sm:max-w-[min(360px,calc((100dvh-340px)*0.96))] md:max-w-[min(410px,calc((100dvh-330px)*0.96))] lg:max-w-[min(576px,calc((100dvh-160px)*0.97))] aspect-[576/592] overflow-visible bg-transparent flex flex-col justify-between will-change-transform"
              >
                <AsciiPortrait
                  src="/assets/aistudio/dushyantPhoto_142a4e7c.png"
                  alt="Portrait of Dushyant Beniwal, Systems architect and Creative developer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Minimal scroll invitation at progress = 0 */}
        <div
          ref={scrollCueRef}
          aria-hidden={introVisible}
          className="pointer-events-none absolute bottom-4 sm:bottom-6 inset-x-0 flex justify-center"
        >
          <div className="flex items-center gap-2.5 text-[11px] font-mono tracking-[0.16em] uppercase text-[#6D7270]">
            <span>SCROLL TO EXPLORE</span>
            <ArrowDown className="w-3.5 h-3.5 text-[#6A0DAD] animate-bounce" />
          </div>
        </div>
      </div>
    </section>
  );
}
