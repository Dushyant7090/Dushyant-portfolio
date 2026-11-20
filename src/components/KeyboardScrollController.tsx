import { useEffect, useRef } from 'react';
import {
  clampTargetScrollY,
  computeArrowScrollStepPx,
  resolveArrowScrollDirection,
  type KeyboardScrollDirection,
} from '../utils/keyboardScroll';

/**
 * Enables responsive, inertial ArrowUp / ArrowDown scrolling across the entire
 * portfolio (and inside open modal dialogs) without fighting GSAP Scrub triggers.
 */
export function KeyboardScrollController() {
  const rafRef = useRef<number | null>(null);
  const targetYRef = useRef<number | null>(null);
  const lastProgrammaticYRef = useRef<number | null>(null);
  const activeDirectionRef = useRef<KeyboardScrollDirection | null>(null);
  const lastFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const getScrollContainer = (): HTMLElement | null => {
      const modalBackdrop = document.querySelector<HTMLElement>('[data-testid="case-study-modal"]');
      if (!modalBackdrop) return null;
      return modalBackdrop.firstElementChild as HTMLElement | null;
    };

    const stopGlide = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      targetYRef.current = null;
      lastProgrammaticYRef.current = null;
      lastFrameRef.current = null;
    };

    const setWindowScrollY = (y: number) => {
      lastProgrammaticYRef.current = y;
      window.scrollTo({ top: y, behavior: 'auto' });
    };

    const startWindowGlide = () => {
      if (rafRef.current !== null) return;
      lastFrameRef.current = null;

      const tick = (now: number) => {
        if (getScrollContainer()) {
          stopGlide();
          return;
        }

        const prevTime = lastFrameRef.current ?? now;
        const dt = Math.min(0.05, Math.max(0.001, (now - prevTime) / 1000));
        lastFrameRef.current = now;

        const maxScrollY = Math.max(
          0,
          document.documentElement.scrollHeight - window.innerHeight,
        );

        // Continuously advance target while key is held for fluid travel across tall scroll tracks
        if (activeDirectionRef.current !== null && targetYRef.current !== null) {
          const holdSpeedPxPerSec = Math.max(780, Math.min(1350, window.innerHeight * 1.15));
          targetYRef.current = clampTargetScrollY(
            targetYRef.current + activeDirectionRef.current * holdSpeedPxPerSec * dt,
            maxScrollY,
          );
        }

        const targetY = targetYRef.current;
        if (targetY === null) {
          stopGlide();
          return;
        }

        const currentY = window.scrollY;
        const diff = targetY - currentY;

        if (Math.abs(diff) <= 0.75 && activeDirectionRef.current === null) {
          setWindowScrollY(targetY);
          stopGlide();
          return;
        }

        const alpha = 1 - Math.exp(-14 * dt);
        const nextY = clampTargetScrollY(currentY + diff * alpha, maxScrollY);
        setWindowScrollY(nextY);

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const targetEl = event.target as HTMLElement | null;
      const direction = resolveArrowScrollDirection({
        key: event.key,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
        defaultPrevented: event.defaultPrevented,
        tagName: targetEl?.tagName,
        isContentEditable: targetEl?.isContentEditable,
      });

      if (direction === null) return;

      // Prevent native jump or focus traps from blocking scroll
      event.preventDefault();

      const modalContainer = getScrollContainer();
      const stepPx = computeArrowScrollStepPx(window.innerHeight, event.repeat);

      if (modalContainer) {
        modalContainer.scrollBy({
          top: direction * stepPx,
          behavior: 'auto',
        });
        return;
      }

      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const maxScrollY = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight,
      );

      if (reducedMotion) {
        stopGlide();
        const nextY = clampTargetScrollY(window.scrollY + direction * stepPx, maxScrollY);
        window.scrollTo({ top: nextY, behavior: 'auto' });
        return;
      }

      activeDirectionRef.current = direction;

      if (!event.repeat) {
        const base = targetYRef.current ?? window.scrollY;
        targetYRef.current = clampTargetScrollY(base + direction * stepPx, maxScrollY);
      } else if (targetYRef.current === null) {
        targetYRef.current = window.scrollY;
      }

      startWindowGlide();
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown' && activeDirectionRef.current === 1) {
        activeDirectionRef.current = null;
      } else if (event.key === 'ArrowUp' && activeDirectionRef.current === -1) {
        activeDirectionRef.current = null;
      }
    };

    const handleExternalScroll = () => {
      if (
        lastProgrammaticYRef.current !== null &&
        Math.abs(window.scrollY - lastProgrammaticYRef.current) > 8 &&
        activeDirectionRef.current === null
      ) {
        stopGlide();
      }
    };

    const handleClear = () => {
      activeDirectionRef.current = null;
      stopGlide();
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('scroll', handleExternalScroll, { passive: true });
    window.addEventListener('blur', handleClear);
    window.addEventListener('wheel', handleClear, { passive: true });
    window.addEventListener('touchstart', handleClear, { passive: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('scroll', handleExternalScroll);
      window.removeEventListener('blur', handleClear);
      window.removeEventListener('wheel', handleClear);
      window.removeEventListener('touchstart', handleClear);
      stopGlide();
    };
  }, []);

  return null;
}
