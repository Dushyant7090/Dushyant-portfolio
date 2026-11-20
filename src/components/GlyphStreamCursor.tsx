import { useCallback, useEffect, useRef } from 'react';
import {
  DEFAULT_GLYPH_POOL,
  computeCellActivation,
  createSplashBurst,
  createTrailNode,
  hexToRgb,
  lerpRgbColor,
  pickStreamGlyph,
  stepTrailNodes,
  type TrailNode,
} from '../utils/glyphStream';

interface GlyphStreamCursorProps {
  colors?: [string, string];
  glyphColor?: string;
  characters?: string;
  cellSize?: number;
  cellGap?: number;
  cellRadius?: number;
  thickness?: number;
  trailLength?: number;
  smoothing?: number;
  cursorRadius?: number;
}

export function GlyphStreamCursor({
  colors = ['#FF804D', '#FFC1A6'],
  glyphColor = '#FFFFFF',
  characters = DEFAULT_GLYPH_POOL,
  cellSize = 12,
  cellGap = 2,
  cellRadius = 3,
  thickness = 0.74,
  trailLength = 0.58,
  smoothing = 0.32,
  cursorRadius = 5.5,
}: GlyphStreamCursorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nodesRef = useRef<TrailNode[]>([]);
  const pointerRef = useRef<{
    x: number;
    y: number;
    smoothX: number;
    smoothY: number;
    hasMoved: boolean;
    isInside: boolean;
  }>({
    x: 0,
    y: 0,
    smoothX: 0,
    smoothY: 0,
    hasMoved: false,
    isInside: false,
  });

  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const tickCountRef = useRef(0);

  const headRgb = hexToRgb(colors[0]);
  const tailRgb = hexToRgb(colors[1]);

  const paintFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const nodes = nodesRef.current;
    if (nodes.length > 0) {
      const step = cellSize + cellGap;
      let minX = width;
      let maxX = 0;
      let minY = height;
      let maxY = 0;

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (n.x - n.radius < minX) minX = n.x - n.radius;
        if (n.x + n.radius > maxX) maxX = n.x + n.radius;
        if (n.y - n.radius < minY) minY = n.y - n.radius;
        if (n.y + n.radius > maxY) maxY = n.y + n.radius;
      }

      const startCol = Math.max(0, Math.floor(minX / step));
      const endCol = Math.min(Math.ceil(width / step), Math.ceil(maxX / step));
      const startRow = Math.max(0, Math.floor(minY / step));
      const endRow = Math.min(Math.ceil(height / step), Math.ceil(maxY / step));

      const glyphStep = Math.floor(tickCountRef.current / 5);
      const fontSize = Math.max(8, Math.round(cellSize * 0.62));
      ctx.font = `600 ${fontSize}px "JetBrains Mono", ui-monospace, SFMono-Regular, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let row = startRow; row <= endRow; row++) {
        const py = row * step;
        const cy = py + cellSize / 2;

        for (let col = startCol; col <= endCol; col++) {
          const px = col * step;
          const cx = px + cellSize / 2;

          const { intensity, ageRatio } = computeCellActivation(cx, cy, nodes);
          if (intensity <= 0.08) {
            continue;
          }

          const [r, g, b] = lerpRgbColor(headRgb, tailRgb, ageRatio);
          const alpha = Math.min(0.76, intensity * 0.74);

          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
          ctx.beginPath();
          ctx.roundRect(px, py, cellSize, cellSize, cellRadius);
          ctx.fill();

          if (intensity > 0.24) {
            const glyph = pickStreamGlyph(col, row, glyphStep, characters);
            ctx.globalAlpha = Math.min(0.95, (intensity - 0.15) * 1.1);
            ctx.fillStyle = glyphColor;
            ctx.fillText(glyph, cx, cy + 0.5);
            ctx.globalAlpha = 1;
          }
        }
      }
    }

    // Draw the compact soft light-orange circular cursor head without a dark circumference stroke
    const ptr = pointerRef.current;
    if (ptr.isInside && ptr.hasMoved) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(ptr.smoothX, ptr.smoothY, cursorRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 134, 84, 0.58)';
      ctx.shadowColor = 'rgba(255, 69, 0, 0.22)';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }, [
    cellGap,
    cellRadius,
    cellSize,
    characters,
    cursorRadius,
    glyphColor,
    headRgb,
    tailRgb,
  ]);

  const startLoop = useCallback(() => {
    if (rafRef.current !== null) {
      return;
    }

    lastTimeRef.current = null;

    const tick = (now: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = now;
      }
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      tickCountRef.current += 1;

      const ptr = pointerRef.current;
      let pointerMoving = false;

      if (ptr.hasMoved) {
        const prevX = ptr.smoothX;
        const prevY = ptr.smoothY;
        const alpha =
          1 - Math.exp(-(14 + (1 - smoothing) * 24) * Math.min(0.05, dt));
        ptr.smoothX += (ptr.x - ptr.smoothX) * alpha;
        ptr.smoothY += (ptr.y - ptr.smoothY) * alpha;

        const dx = ptr.smoothX - prevX;
        const dy = ptr.smoothY - prevY;
        const dist = Math.hypot(dx, dy);
        pointerMoving = Math.hypot(ptr.x - ptr.smoothX, ptr.y - ptr.smoothY) > 0.35;

        if (dist > 1.5 && dt > 0 && ptr.isInside) {
          const vx = dx / dt;
          const vy = dy / dt;
          const steps = Math.min(4, Math.max(1, Math.floor(dist / 10)));
          for (let s = 1; s <= steps; s++) {
            const frac = s / steps;
            nodesRef.current.push(
              createTrailNode(
                prevX + dx * frac,
                prevY + dy * frac,
                vx,
                vy,
                21,
                thickness,
                trailLength
              )
            );
          }
          if (nodesRef.current.length > 140) {
            nodesRef.current.splice(0, nodesRef.current.length - 140);
          }
        }
      }

      nodesRef.current = stepTrailNodes(nodesRef.current, dt, 4.8);
      paintFrame();

      if (nodesRef.current.length > 0 || pointerMoving) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [paintFrame, smoothing, thickness, trailLength]);

  useEffect(() => {
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const syncSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      paintFrame();
    };

    syncSize();

    const handlePointerMove = (e: PointerEvent) => {
      const ptr = pointerRef.current;
      ptr.isInside = true;
      if (!ptr.hasMoved) {
        ptr.x = e.clientX;
        ptr.y = e.clientY;
        ptr.smoothX = e.clientX;
        ptr.smoothY = e.clientY;
        ptr.hasMoved = true;
        nodesRef.current.push(
          createTrailNode(e.clientX, e.clientY, 0, 0, 24, thickness, trailLength)
        );
      } else {
        ptr.x = e.clientX;
        ptr.y = e.clientY;
      }
      startLoop();
    };

    const handlePointerDown = (e: PointerEvent) => {
      pointerRef.current.isInside = true;
      const burst = createSplashBurst(e.clientX, e.clientY, 9, 24, trailLength);
      nodesRef.current.push(...burst);
      if (nodesRef.current.length > 160) {
        nodesRef.current.splice(0, nodesRef.current.length - 160);
      }
      startLoop();
    };

    const handlePointerLeaveWindow = () => {
      pointerRef.current.isInside = false;
      startLoop();
    };

    window.addEventListener('resize', syncSize);
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    document.addEventListener('mouseleave', handlePointerLeaveWindow);

    return () => {
      window.removeEventListener('resize', syncSize);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('mouseleave', handlePointerLeaveWindow);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [paintFrame, startLoop, thickness, trailLength]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-testid="glyph-stream-cursor"
      className="fixed inset-0 w-full h-full pointer-events-none z-[60]"
    />
  );
}
