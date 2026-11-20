import { useCallback, useEffect, useRef, useState } from 'react';
import {
  samplePixelToCell,
  stepLensState,
  type AsciiCell,
  type LensState,
} from '../utils/asciiPortrait';
import {
  TOUCH_HOLD_MS,
  createInitialTouchState,
  endTouchGesture,
  evaluateTouchHold,
  markTouchScrolling,
  startTouchGesture,
  stepTouchMove,
  type TouchGestureState,
} from '../utils/touchCursor';

interface AsciiPortraitProps {
  src: string;
  alt: string;
}

const LENS_RADIUS = 88;

export function AsciiPortrait({ src, alt }: AsciiPortraitProps) {
  const containerRef = useRef<HTMLButtonElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Pre-rendered offscreen canvas containing the full Pixel-Accurate Character Matrix
  const cacheCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sizeRef = useRef<{ width: number; height: number; dpr: number }>({
    width: 0,
    height: 0,
    dpr: 1,
  });

  // Smooth damped lens physics state
  const currentLensRef = useRef<LensState>({ x: 0, y: 0, radius: 0 });
  const targetLensRef = useRef<LensState>({ x: 0, y: 0, radius: 0 });
  const isActiveRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const touchStateRef = useRef<TouchGestureState>(createInitialTouchState());
  const touchHoldTimerRef = useRef<number | null>(null);
  const lastPointerTypeRef = useRef<string>('mouse');

  const [imgFailed, setImgFailed] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [isLensActive, setIsLensActive] = useState(false);

  const buildAsciiCache = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const img = imgRef.current;

    if (!container || !canvas || !img || !img.complete || img.naturalWidth === 0) {
      return;
    }

    const rect = container.getBoundingClientRect();
    const width = Math.floor(rect.width);
    const height = Math.floor(rect.height);
    if (width <= 0 || height <= 0) {
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    sizeRef.current = { width, height, dpr };
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    // Match CSS `pt-4 sm:pt-5` + `object-contain object-bottom` geometry
    const topPad = window.innerWidth >= 640 ? 20 : 16;
    const availH = Math.max(1, height - topPad);
    const scale = Math.min(width / img.naturalWidth, availH / img.naturalHeight);
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    const offsetX = (width - drawW) / 2;
    const offsetY = height - drawH;

    // Calibrated grid density: ~96 columns on desktop for sharp facial likeness + legible glyphs
    const targetCols = width < 400 ? 64 : 96;
    const cellW = drawW / targetCols;
    const cellH = cellW * 1.36;
    const cols = Math.max(1, Math.floor(drawW / cellW));
    const rows = Math.max(1, Math.floor((drawH - 4) / cellH));
    const fontSize = Math.max(6.8, Math.round(cellW * 1.45 * 10) / 10);

    // Sample portrait onto tiny offscreen canvas matching (cols x rows)
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = cols;
    sampleCanvas.height = rows;
    const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
    if (!sampleCtx) {
      return;
    }
    sampleCtx.clearRect(0, 0, cols, rows);
    sampleCtx.drawImage(img, 0, 0, cols, rows);
    const { data } = sampleCtx.getImageData(0, 0, cols, rows);

    // Render full character matrix once onto cached offscreen canvas at DPR resolution
    const cache = cacheCanvasRef.current ?? document.createElement('canvas');
    cache.width = Math.floor(width * dpr);
    cache.height = Math.floor(height * dpr);
    const cacheCtx = cache.getContext('2d');
    if (!cacheCtx) {
      return;
    }

    cacheCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cacheCtx.clearRect(0, 0, width, height);
    cacheCtx.font = `600 ${fontSize}px "JetBrains Mono", ui-monospace, SFMono-Regular, monospace`;
    cacheCtx.textAlign = 'center';
    cacheCtx.textBaseline = 'middle';

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = (r * cols + c) * 4;
        const cell: AsciiCell | null = samplePixelToCell(
          data[idx],
          data[idx + 1],
          data[idx + 2],
          data[idx + 3],
          c,
          r,
          0
        );
        if (!cell) {
          continue;
        }
        const x = offsetX + c * cellW + cellW / 2;
        const y = offsetY + r * cellH + cellH / 2;
        cacheCtx.fillStyle = cell.color;
        cacheCtx.fillText(cell.char, x, y);
      }
    }

    cacheCanvasRef.current = cache;
  }, []);

  const paintLensFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const cache = cacheCanvasRef.current;
    const { width, height, dpr } = sizeRef.current;
    if (!canvas || !cache || width <= 0 || height <= 0) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const { x, y, radius } = currentLensRef.current;
    if (radius > 0.75) {
      // 1. Clip strictly to the circular cursor area and replace photo with card paper + ASCII matrix
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.clip();

      ctx.fillStyle = '#ECEAE2';
      ctx.fillRect(x - radius - 2, y - radius - 2, radius * 2 + 4, radius * 2 + 4);
      ctx.drawImage(cache, 0, 0, width, height);
      ctx.restore();
    }

    ctx.restore();
  }, []);

  const ensureAnimationLoop = useCallback(() => {
    if (rafRef.current !== null) {
      return;
    }

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion) {
      currentLensRef.current = { ...targetLensRef.current };
      paintLensFrame();
      return;
    }

    lastTimeRef.current = null;

    const tick = (now: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = now;
      }
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      const next = stepLensState(currentLensRef.current, targetLensRef.current, dt);
      currentLensRef.current = next;
      paintLensFrame();

      const target = targetLensRef.current;
      const settled =
        Math.abs(target.x - next.x) < 0.08 &&
        Math.abs(target.y - next.y) < 0.08 &&
        Math.abs(target.radius - next.radius) < 0.15;

      if (!settled || isActiveRef.current) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [paintLensFrame]);

  useEffect(() => {
    if (!imgLoaded) {
      return;
    }

    buildAsciiCache();

    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(() => {
      buildAsciiCache();
      paintLensFrame();
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [imgLoaded, buildAsciiCache, paintLensFrame]);

  const clearTouchHoldTimer = useCallback(() => {
    if (touchHoldTimerRef.current !== null) {
      window.clearTimeout(touchHoldTimerRef.current);
      touchHoldTimerRef.current = null;
    }
  }, []);

  const deactivateLens = useCallback(() => {
    isActiveRef.current = false;
    setIsLensActive(false);
    targetLensRef.current = {
      ...targetLensRef.current,
      radius: 0,
    };
    ensureAnimationLoop();
  }, [ensureAnimationLoop]);

  useEffect(() => {
    const handleScroll = () => {
      if (lastPointerTypeRef.current === 'touch' || touchStateRef.current.phase !== 'idle') {
        clearTouchHoldTimer();
        touchStateRef.current = markTouchScrolling(touchStateRef.current);
        if (isActiveRef.current) {
          deactivateLens();
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTouchHoldTimer();
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [clearTouchHoldTimer, deactivateLens]);

  const getLocalCoords = (clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) {
      return null;
    }
    const rect = container.getBoundingClientRect();
    const scaleX = rect.width > 0 ? container.clientWidth / rect.width : 1;
    const scaleY = rect.height > 0 ? container.clientHeight / rect.height : 1;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const activateLensAtClientCoords = (clientX: number, clientY: number) => {
    const coords = getLocalCoords(clientX, clientY);
    if (!coords) {
      return;
    }
    isActiveRef.current = true;
    setIsLensActive(true);

    if (currentLensRef.current.radius < 1) {
      currentLensRef.current = { x: coords.x, y: coords.y, radius: 0 };
    }
    targetLensRef.current = { x: coords.x, y: coords.y, radius: LENS_RADIUS };
    ensureAnimationLoop();
  };

  const isGlobalTouchDragging = () => {
    if (typeof document === 'undefined') {
      return false;
    }
    const cursorCanvas = document.querySelector('[data-testid="glyph-stream-cursor"]');
    return cursorCanvas?.getAttribute('data-touch-phase') === 'dragging';
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    lastPointerTypeRef.current = e.pointerType;
    if (e.pointerType !== 'touch') {
      return;
    }
    if (!e.isPrimary) {
      clearTouchHoldTimer();
      touchStateRef.current = markTouchScrolling(touchStateRef.current);
      deactivateLens();
      return;
    }

    clearTouchHoldTimer();
    touchStateRef.current = startTouchGesture(
      e.clientX,
      e.clientY,
      e.pointerId,
      performance.now()
    );

    touchHoldTimerRef.current = window.setTimeout(() => {
      touchHoldTimerRef.current = null;
      const evaluated = evaluateTouchHold(touchStateRef.current, performance.now());
      if (evaluated.phase === 'dragging' && touchStateRef.current.phase === 'pending') {
        touchStateRef.current = evaluated;
        activateLensAtClientCoords(evaluated.x, evaluated.y);
      }
    }, TOUCH_HOLD_MS);
  };

  const handlePointerEnter = (e: React.PointerEvent<HTMLButtonElement>) => {
    lastPointerTypeRef.current = e.pointerType;
    if (e.pointerType === 'touch') {
      if (touchStateRef.current.phase === 'dragging' || isGlobalTouchDragging()) {
        activateLensAtClientCoords(e.clientX, e.clientY);
      }
      return;
    }
    activateLensAtClientCoords(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    lastPointerTypeRef.current = e.pointerType;
    if (e.pointerType === 'touch') {
      if (touchStateRef.current.pointerId === e.pointerId) {
        const next = stepTouchMove(
          touchStateRef.current,
          e.clientX,
          e.clientY,
          performance.now()
        );
        touchStateRef.current = next;

        if (next.phase === 'scrolling') {
          clearTouchHoldTimer();
          deactivateLens();
          return;
        }
        if (next.phase !== 'dragging') {
          return;
        }
        clearTouchHoldTimer();
      } else if (!isGlobalTouchDragging()) {
        return;
      }
    }

    const coords = getLocalCoords(e.clientX, e.clientY);
    if (!coords) {
      return;
    }
    isActiveRef.current = true;
    if (!isLensActive) {
      setIsLensActive(true);
    }
    targetLensRef.current = { x: coords.x, y: coords.y, radius: LENS_RADIUS };
    ensureAnimationLoop();
  };

  const handlePointerLeave = (e?: React.PointerEvent<HTMLButtonElement>) => {
    if (!e || e.pointerType === 'touch' || lastPointerTypeRef.current === 'touch') {
      clearTouchHoldTimer();
      touchStateRef.current = endTouchGesture();
    }
    deactivateLens();
  };

  const handleKeyToggle = () => {
    const { width, height } = sizeRef.current;
    if (width <= 0 || height <= 0) {
      return;
    }
    if (isActiveRef.current) {
      handlePointerLeave();
    } else {
      isActiveRef.current = true;
      setIsLensActive(true);
      const center = { x: width * 0.5, y: height * 0.36 };
      if (currentLensRef.current.radius < 1) {
        currentLensRef.current = { ...center, radius: 0 };
      }
      targetLensRef.current = { ...center, radius: LENS_RADIUS };
      ensureAnimationLoop();
    }
  };

  if (imgFailed) {
    return (
      <div className="flex-1 bg-gradient-to-br from-[#EAE8E1] to-[#DCDAD0] flex flex-col items-center justify-center p-8 text-center">
        <span className="font-display text-3xl font-semibold text-[#14191A] tracking-tight">
          DB
        </span>
        <span className="mt-2 text-xs uppercase tracking-[0.12em] text-[#55595E]">
          Dushyant Beniwal — Delhi
        </span>
      </div>
    );
  }

  return (
    <button
      ref={containerRef}
      type="button"
      onPointerDown={handlePointerDown}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerLeave}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerLeave}
      onBlur={() => handlePointerLeave()}
      onClick={(e) => {
        // Keyboard activation (detail === 0)
        if (e.detail === 0) {
          handleKeyToggle();
        }
      }}
      aria-pressed={isLensActive}
      aria-label="Portrait of Dushyant Beniwal — move cursor across portrait to reveal character matrix inside lens"
      data-ascii-portrait="true"
      className="relative flex-1 w-full flex items-end justify-center pt-4 sm:pt-5 overflow-visible bg-transparent border-0 p-0 cursor-default text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6A0DAD]"
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onLoad={() => setImgLoaded(true)}
        onError={() => setImgFailed(true)}
        className="w-full h-full object-contain object-bottom block select-none"
      />

      <canvas
        ref={canvasRef}
        aria-hidden="true"
        data-testid="ascii-portrait-canvas"
        data-active={isLensActive ? 'true' : 'false'}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Subtle bottom 30% CSS gradient fade into page background while upper 70% remains untouched */}
      <div
        aria-hidden="true"
        data-testid="portrait-bottom-fade"
        className="pointer-events-none absolute -inset-x-[4px] -bottom-[4px] h-[calc(30%+4px)] bg-[linear-gradient(to_top,rgb(236,234,226)_0%,rgb(236,234,226)_6%,rgba(236,234,226,0.8)_38%,rgba(236,234,226,0.32)_69%,rgba(236,234,226,0)_100%)]"
      />
    </button>
  );
}
