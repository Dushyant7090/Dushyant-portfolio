import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  DEFAULT_WOVEN_PHYSICS,
  buildWovenWordmarkParticles,
  computeParticleWeaveState,
  sampleAlphaMaskToWovenParticles,
  stepWovenParticles,
  type WovenGridLayout,
  type WovenPointer,
} from '../utils/wovenWordmark';

gsap.registerPlugin(ScrollTrigger);

function WovenPixelArrowUp() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      className="shrink-0 transition-transform duration-jk-fast group-hover:-translate-y-0.5"
    >
      <rect x="7" y="1" width="2" height="2" />
      <rect x="5" y="3" width="6" height="2" />
      <rect x="3" y="5" width="10" height="2" />
      <rect x="7" y="7" width="2" height="2" />
      <rect x="6" y="10" width="4" height="1.5" />
      <rect x="6" y="12.5" width="4" height="1.5" />
    </svg>
  );
}

/**
 * Rasterizes "DUSHYANT" in Geist ExtraBold onto a tight high-res offscreen grid
 * (~24 rows vertical) so curves & proportions match Geist typography while turning
 * every filled cell into alternating (-) and (|) woven dashes.
 */
function sampleGeistWordmarkLayout(
  text: string,
  canvasWidth: number,
  canvasHeight: number,
): WovenGridLayout {
  if (typeof document === 'undefined' || canvasWidth <= 0 || canvasHeight <= 0) {
    return buildWovenWordmarkParticles(text, canvasWidth, canvasHeight);
  }

  const measureCanvas = document.createElement('canvas');
  const measureCtx = measureCanvas.getContext('2d');
  if (!measureCtx) {
    return buildWovenWordmarkParticles(text, canvasWidth, canvasHeight);
  }

  const targetRows = canvasWidth < 520 ? 12 : 24;
  const fontSize = 140;
  const letterSpacingPx = canvasWidth < 520 ? 16 : 11;
  measureCtx.font = `800 ${fontSize}px "Geist", "Plus Jakarta Sans", sans-serif`;

  const chars = text.toUpperCase().split('');
  const charWidths = chars.map((ch) => measureCtx.measureText(ch).width);
  const totalTextWidth =
    charWidths.reduce((sum, w) => sum + w, 0) +
    Math.max(0, chars.length - 1) * letterSpacingPx;

  const sampleScale = (targetRows * 1.18) / fontSize;
  const maskCols = Math.max(48, Math.ceil(totalTextWidth * sampleScale) + 4);
  const maskRows = targetRows;

  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = maskCols;
  maskCanvas.height = maskRows;
  const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
  if (!maskCtx) {
    return buildWovenWordmarkParticles(text, canvasWidth, canvasHeight);
  }

  maskCtx.clearRect(0, 0, maskCols, maskRows);
  maskCtx.fillStyle = '#000000';
  maskCtx.font = `800 ${fontSize * sampleScale}px "Geist", "Plus Jakarta Sans", sans-serif`;
  maskCtx.textBaseline = 'middle';

  let cursorX = 2;
  const baselineY = maskRows / 2 + 0.35;
  for (let i = 0; i < chars.length; i++) {
    maskCtx.fillText(chars[i], cursorX, baselineY);
    cursorX += (charWidths[i] + letterSpacingPx) * sampleScale;
  }

  const imgData = maskCtx.getImageData(0, 0, maskCols, maskRows).data;

  // Trim empty top/bottom/side rows so grid fills full canvas cleanly
  let minR = maskRows;
  let maxR = -1;
  let minC = maskCols;
  let maxC = -1;
  const threshold = 92;

  for (let r = 0; r < maskRows; r++) {
    for (let c = 0; c < maskCols; c++) {
      const alpha = imgData[(r * maskCols + c) * 4 + 3];
      if (alpha >= threshold) {
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
      }
    }
  }

  if (maxR < minR || maxC < minC) {
    return buildWovenWordmarkParticles(text, canvasWidth, canvasHeight);
  }

  const croppedCols = maxC - minC + 1;
  const croppedRows = maxR - minR + 1;

  return sampleAlphaMaskToWovenParticles({
    cols: croppedCols,
    rows: croppedRows,
    canvasWidth,
    canvasHeight,
    threshold,
    padX: Math.max(2, canvasWidth * 0.004),
    padY: 10,
    alphaAt: (c, r) => imgData[((r + minR) * maskCols + (c + minC)) * 4 + 3],
  });
}

interface WovenDushyantCanvasProps {
  weaveProgressRef: React.MutableRefObject<{ value: number }>;
  drawVersion: number;
  reducedMotion: boolean;
}

function WovenDushyantWordmark({
  weaveProgressRef,
  drawVersion,
  reducedMotion,
}: WovenDushyantCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const layoutRef = useRef<WovenGridLayout>({
    particles: [],
    cellSize: 0,
    cols: 0,
    rows: 0,
    gridLeft: 0,
    gridTop: 0,
    gridWidth: 0,
    gridHeight: 0,
  });
  const pointerRef = useRef<WovenPointer>({ x: 0, y: 0, active: false });
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const sizeRef = useRef<{ width: number; height: number; dpr: number }>({
    width: 0,
    height: 0,
    dpr: 1,
  });

  const drawScene = useCallback(() => {
    const canvas = canvasRef.current;
    const { width, height, dpr } = sizeRef.current;
    if (!canvas || width <= 0 || height <= 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const { particles, cellSize } = layoutRef.current;
    const progress = reducedMotion ? 1 : weaveProgressRef.current.value;

    // Crisp woven dashes (- and |) forming DUSHYANT over clean background
    const dashLen = Math.max(1.9, cellSize * 0.76);
    const strokeThick = Math.max(0.85, Math.min(2.2, cellSize * 0.2));
    ctx.lineCap = 'round';
    ctx.lineWidth = strokeThick;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const weave = reducedMotion
        ? { offsetY: 0, opacity: 1 }
        : computeParticleWeaveState(p.enterPhase, progress, 24);

      if (weave.opacity <= 0.01) continue;

      const dx = p.x - p.homeX;
      const dy = p.y - p.homeY;
      const disp = Math.hypot(dx, dy);
      const t = Math.min(1, disp / 26);

      // Charcoal ink #111315 -> #6A0DAD (106, 13, 173) on cursor displacement
      const r = Math.round(17 + (106 - 17) * t);
      const g = Math.round(19 + (13 - 19) * t);
      const b = Math.round(21 + (173 - 21) * t);

      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${weave.opacity.toFixed(3)})`;

      const cx = p.x;
      const cy = p.y + weave.offsetY;
      const half = dashLen * 0.5;

      ctx.beginPath();
      if (p.orientation === 'h') {
        ctx.moveTo(cx - half, cy);
        ctx.lineTo(cx + half, cy);
      } else {
        ctx.moveTo(cx, cy - half);
        ctx.lineTo(cx, cy + half);
      }
      ctx.stroke();
    }

    ctx.restore();
  }, [reducedMotion, weaveProgressRef]);

  // Redraw when GSAP weaveProgress ticks
  useEffect(() => {
    drawScene();
  }, [drawVersion, drawScene]);

  const ensurePhysicsLoop = useCallback(() => {
    if (rafRef.current !== null || reducedMotion) return;

    lastTimeRef.current = null;

    const tick = (now: number) => {
      const prev = lastTimeRef.current ?? now;
      const dt = (now - prev) / 1000;
      lastTimeRef.current = now;

      const scaleFactor = Math.max(0.45, Math.min(1.15, sizeRef.current.width / 1120));
      const keepRunning = stepWovenParticles(
        layoutRef.current.particles,
        pointerRef.current,
        dt,
        {
          ...DEFAULT_WOVEN_PHYSICS,
          repulsionRadius: DEFAULT_WOVEN_PHYSICS.repulsionRadius * scaleFactor,
          repulsionStrength: DEFAULT_WOVEN_PHYSICS.repulsionStrength * scaleFactor,
        },
      );

      drawScene();

      if (keepRunning) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [drawScene, reducedMotion]);

  const [canvasBoxHeight, setCanvasBoxHeight] = useState<number | null>(null);

  const rebuildGrid = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const rect = container.getBoundingClientRect();
    const width = Math.floor(rect.width);
    if (width <= 0) return;

    // Sample with generous virtual height first so horizontal glyph span determines exact cellSize
    const probeLayout = sampleGeistWordmarkLayout('DUSHYANT', width, Math.max(160, Math.round(width * 0.25)));
    const tightHeight = Math.max(64, Math.ceil(probeLayout.gridHeight + 20));
    const finalLayout = sampleGeistWordmarkLayout('DUSHYANT', width, tightHeight);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    sizeRef.current = { width, height: tightHeight, dpr };
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(tightHeight * dpr);
    layoutRef.current = finalLayout;

    setCanvasBoxHeight((prev) => (prev === tightHeight ? prev : tightHeight));
    drawScene();
  }, [drawScene]);

  useEffect(() => {
    rebuildGrid();

    let cancelled = false;
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (!cancelled) rebuildGrid();
      });
    }

    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', rebuildGrid);
      return () => {
        cancelled = true;
        window.removeEventListener('resize', rebuildGrid);
      };
    }

    const observer = new ResizeObserver(() => {
      rebuildGrid();
    });
    observer.observe(container);

    return () => {
      cancelled = true;
      observer.disconnect();
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [rebuildGrid]);

  const updatePointerFromEvent = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    pointerRef.current = {
      x: clientX - rect.left,
      y: clientY - rect.top,
      active: true,
    };
    ensurePhysicsLoop();
  };

  const handlePointerLeave = () => {
    pointerRef.current.active = false;
    ensurePhysicsLoop();
  };

  return (
    <div
      ref={containerRef}
      data-testid="woven-dushyant-wordmark"
      onPointerEnter={(e) => updatePointerFromEvent(e.clientX, e.clientY)}
      onPointerMove={(e) => updatePointerFromEvent(e.clientX, e.clientY)}
      onPointerDown={(e) => updatePointerFromEvent(e.clientX, e.clientY)}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerLeave}
      style={canvasBoxHeight !== null ? { height: `${canvasBoxHeight}px` } : undefined}
      className="relative w-full h-[80px] sm:h-[120px] md:h-[150px] lg:h-[180px] select-none touch-pan-y"
    >
      <span className="sr-only">DUSHYANT</span>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="DUSHYANT interactive woven dash typography"
        className="block w-full h-full"
      />
    </div>
  );
}

/**
 * High-DPI animated fine line canvas running across the top seam of the footer,
 * driven by GSAP ScrollTrigger weave progress.
 */
function TopWeavingLineCanvas({
  weaveProgressRef,
  drawVersion,
  reducedMotion,
}: WovenDushyantCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const drawTopLine = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    const width = parent ? Math.floor(parent.clientWidth) : window.innerWidth;
    const height = 16;
    if (width <= 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const progress = reducedMotion ? 1 : Math.min(1, weaveProgressRef.current.value * 1.15);
    const y = 7 + 0.5 / dpr;

    // Fine 0.75px hairline spanning the footer top edge
    ctx.lineWidth = 0.75;
    ctx.strokeStyle = 'rgba(20, 25, 26, 0.14)';
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width * progress, y);
    ctx.stroke();

    // Subtle weaving shuttle accent
    if (progress > 0.02) {
      const leadX = width * progress;
      const accentStart = Math.max(0, leadX - 96);
      ctx.lineWidth = 1;
      ctx.strokeStyle =
        progress >= 0.99 ? 'rgba(106, 13, 173, 0.28)' : 'rgba(106, 13, 173, 0.65)';
      ctx.beginPath();
      ctx.moveTo(accentStart, y);
      ctx.lineTo(leadX, y);
      ctx.stroke();
    }

    ctx.restore();
  }, [reducedMotion, weaveProgressRef]);

  useEffect(() => {
    drawTopLine();
  }, [drawVersion, drawTopLine]);

  useEffect(() => {
    window.addEventListener('resize', drawTopLine);
    return () => window.removeEventListener('resize', drawTopLine);
  }, [drawTopLine]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="block w-full h-4 pointer-events-none"
    />
  );
}

export function FooterSection() {
  const footerRef = useRef<HTMLElement | null>(null);
  const weaveProgressRef = useRef<{ value: number }>({ value: 1 });
  const [drawVersion, setDrawVersion] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const footerEl = footerRef.current;
    if (!footerEl) return;

    if (reducedMotion) {
      weaveProgressRef.current.value = 1;
      setDrawVersion((v) => v + 1);
      return;
    }

    weaveProgressRef.current.value = 0;
    setDrawVersion((v) => v + 1);

    const ctx = gsap.context(() => {
      // Overflow-clip vertical slide-up reveal on heading & staggered rows
      gsap.from('.footer-animate-text', {
        y: '100%',
        duration: 1,
        stagger: 0.09,
        ease: 'power4.out',
        clearProps: 'transform',
        scrollTrigger: {
          trigger: footerEl,
          start: 'top 82%',
          once: true,
        },
      });

      // Weaving line & DUSHYANT dash entrance synced to footer ScrollTrigger
      gsap.to(weaveProgressRef.current, {
        value: 1,
        duration: 1.15,
        ease: 'power3.out',
        onUpdate: () => {
          setDrawVersion((v) => v + 1);
        },
        scrollTrigger: {
          trigger: footerEl,
          start: 'top 84%',
          once: true,
        },
      });
    }, footerRef);

    // Ensure ScrollTrigger recalculates cleanly once fonts/sections settle
    const refreshId = window.setTimeout(() => ScrollTrigger.refresh(), 120);

    return () => {
      window.clearTimeout(refreshId);
      ctx.revert();
    };
  }, [reducedMotion]);

  const handleBackToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  };

  return (
    <footer
      ref={footerRef}
      id="contact"
      aria-labelledby="contact-heading"
      data-testid="portfolio-footer"
      className="relative z-20 bg-[#ECEAE2] text-[#14191A] font-geist scroll-mt-[84px] sm:scroll-mt-[100px]"
    >
      {/* Top Delicate High-DPI Canvas Line */}
      <TopWeavingLineCanvas
        weaveProgressRef={weaveProgressRef}
        drawVersion={drawVersion}
        reducedMotion={reducedMotion}
      />

      <div className="max-w-[1320px] mx-auto px-5 sm:px-8 md:px-10 pt-14 sm:pt-20 lg:pt-24">
        {/* Main CTA Headline Block with overflow: clip GSAP reveal */}
        <div className="max-w-[960px]">
          <h2
            id="contact-heading"
            className="font-geist text-[40px] sm:text-[60px] md:text-[74px] lg:text-[86px] font-bold tracking-[-0.04em] leading-[0.94] text-[#111315] uppercase"
          >
            <span className="block" style={{ overflow: 'clip' }}>
              <span className="footer-animate-text block">HAVE SOMETHING</span>
            </span>
            <span className="block" style={{ overflow: 'clip' }}>
              <span className="footer-animate-text block">TO BUILD?</span>
            </span>
          </h2>

          <div className="mt-4 sm:mt-5" style={{ overflow: 'clip' }}>
            <p className="footer-animate-text font-geist-mono text-[11.5px] sm:text-[12.5px] tracking-[0.16em] uppercase text-[#14191A]/50">
              DATA ANALYTICS · MACHINE LEARNING · FULL-STACK ENGINEERING
            </p>
          </div>

          <div className="mt-7 sm:mt-9" style={{ overflow: 'clip' }}>
            <div className="footer-animate-text inline-block">
              <a
                href="mailto:dushyant7090@gmail.com"
                className="jk-cut group inline-flex items-center justify-center gap-2.5 bg-[#111315] hover:bg-[rgb(218,72,24)] text-[#F7F6F2] font-geist-mono text-[12px] tracking-[0.16em] uppercase px-7 sm:px-8 py-4 min-h-[48px] transition-all duration-jk-fast hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(218,72,24,0.24)] motion-reduce:hover:translate-y-0 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[rgb(218,72,24)]"
              >
                <span>SEND AN EMAIL</span>
                <ArrowUpRight
                  className="w-4 h-4 transition-transform duration-jk-fast group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </a>
            </div>
          </div>
        </div>

        {/* Two-Column Direct & Elsewhere Contact Grid */}
        <div className="mt-12 sm:mt-14 lg:mt-16 pb-5 sm:pb-7 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-14">
          <div>
            <h3 className="font-geist-mono text-[11px] font-semibold tracking-[0.18em] uppercase text-[rgb(218,72,24)]">
              DIRECT
            </h3>
            <ul className="mt-4 flex flex-col items-start gap-1">
              <li>
                <a
                  href="tel:+917090309201"
                  className="group inline-flex items-center gap-1.5 min-h-[44px] font-geist text-[16px] sm:text-[17.5px] font-medium tracking-[-0.015em] text-[#111315] underline-offset-4 hover:underline transition-colors duration-jk-fast focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#111315]"
                >
                  <span className="tabular-nums">+91 7090309201</span>
                  <ArrowUpRight
                    className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-transform duration-jk-fast group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </a>
              </li>
              <li>
                <a
                  href="mailto:dushyant7090@gmail.com"
                  className="group inline-flex items-center gap-1.5 min-h-[44px] font-geist text-[16px] sm:text-[17.5px] font-medium tracking-[-0.015em] text-[#111315] underline-offset-4 hover:underline transition-colors duration-jk-fast break-all sm:break-normal focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#111315]"
                >
                  <span>dushyant7090@gmail.com</span>
                  <ArrowUpRight
                    className="w-4 h-4 opacity-50 group-hover:opacity-100 shrink-0 transition-transform duration-jk-fast group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-geist-mono text-[11px] font-semibold tracking-[0.18em] uppercase text-[rgb(218,72,24)]">
              ELSEWHERE
            </h3>
            <ul className="mt-4 flex flex-col items-start gap-1">
              <li>
                <a
                  href="https://www.linkedin.com/in/dushyant-beniwal-b16281306/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-1.5 min-h-[44px] font-geist text-[16px] sm:text-[17.5px] font-medium tracking-[-0.015em] text-[#111315] underline-offset-4 hover:underline transition-colors duration-jk-fast focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#111315]"
                >
                  <span>LinkedIn</span>
                  <ArrowUpRight
                    className="w-4 h-4 opacity-55 group-hover:opacity-100 transition-transform duration-jk-fast group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* High-Res Geist-Sampled Interactive Woven Dash Wordmark: DUSHYANT */}
        <div className="pt-2 pb-5 sm:pb-7">
          <WovenDushyantWordmark
            weaveProgressRef={weaveProgressRef}
            drawVersion={drawVersion}
            reducedMotion={reducedMotion}
          />
        </div>

        {/* Copyright, Accurate Tech Stack Credits & Back-to-Top Row */}
        <div className="border-t border-black/[0.10] py-5 sm:py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-6 font-geist-mono text-[11px] tracking-[0.14em] uppercase text-[#14191A]/65">
          <p>&copy; 2026 DUSHYANT BENIWAL</p>

          <p className="text-[#14191A]/50">BUILT WITH REACT, THREE.JS &amp; GSAP</p>

          <button
            type="button"
            onClick={handleBackToTop}
            aria-label="Back to top"
            className="group inline-flex items-center gap-2 min-h-[44px] -my-2 font-geist-mono text-[11px] tracking-[0.14em] uppercase text-[#111315] hover:text-[#6A0DAD] underline-offset-4 hover:underline transition-colors duration-jk-fast whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6A0DAD]"
          >
            <span>BACK TO TOP</span>
            <WovenPixelArrowUp />
          </button>
        </div>
      </div>

      <div className="max-w-[1320px] mx-auto px-5 sm:px-8 md:px-10 pb-8 sm:pb-10">
        <p className="font-geist-mono text-[10.5px] tracking-[0.15em] uppercase text-[#14191A]/45">
          CRAFTED FOR CLARITY · DATA ANALYTICS &amp; SOFTWARE ENGINEERING
        </p>
      </div>
    </footer>
  );
}
