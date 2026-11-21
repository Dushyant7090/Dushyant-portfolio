import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei/core/ContactShadows';
import { Environment } from '@react-three/drei/core/Environment';
import { Lightformer } from '@react-three/drei/core/Lightformer';
import { RoundedBox } from '@react-three/drei/core/RoundedBox';
import { Html } from '@react-three/drei/web/Html';
import {
  ACESFilmicToneMapping,
  CanvasTexture,
  FrontSide,
  ShaderMaterial,
  type Clock,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  type MeshPhysicalMaterial,
  type PerspectiveCamera,
} from 'three';
import { gsap, ScrollTrigger } from '../utils/gsapSetup';
import { getToolkitStats, TOOLKIT_CATEGORIES, type ToolkitCategory } from '../data/toolkit';
import {
  computeResponsiveCameraFraming,
  computeToolkitLeftHeadingLayout,
  computeToolkitLeftHeadingPose,
  computeToolkitPrismPose,
  type CameraFraming,
} from '../utils/toolkitPrism';
import { ToolkitFaceBoard } from './ToolkitFaceBoard';
import { ToolkitLeftHeadingWordmark } from './ToolkitLeftHeadingWordmark';
import {
  createThreeTimerClock,
  installThreeClockDeprecationFilter,
  type ThreeTimerClockAdapter,
} from '../utils/threeTimerClock';

installThreeClockDeprecationFilter();

interface ToolkitSectionProps {
  categories?: readonly ToolkitCategory[];
}

function detectSoftwareWebGL(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: false }) ||
      canvas.getContext('webgl', { failIfMajorPerformanceCaveat: false });
    if (!gl) return true;

    let rendererName = '';
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      rendererName = String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '');
    }
    if (!rendererName) {
      rendererName = String(gl.getParameter(gl.RENDERER) || '');
    }

    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /swiftshader|llvmpipe|softpipe|software/i.test(rendererName);
  } catch {
    return true;
  }
}

function createSoftShadowTexture(): CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const grad = ctx.createRadialGradient(size / 2, size / 2, 12, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(32, 30, 26, 0.28)');
  grad.addColorStop(0.42, 'rgba(32, 30, 26, 0.14)');
  grad.addColorStop(0.75, 'rgba(32, 30, 26, 0.04)');
  grad.addColorStop(1, 'rgba(32, 30, 26, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function ResponsiveCameraRig({ framing }: { framing: CameraFraming }) {
  const { camera } = useThree();

  useEffect(() => {
    const persp = camera as PerspectiveCamera;
    persp.fov = framing.fovDeg;
    persp.position.set(0, 0, framing.cameraZ);
    persp.lookAt(0, 0, 0);
    persp.updateProjectionMatrix();
  }, [camera, framing.cameraZ, framing.fovDeg]);

  return null;
}

function ClearGlassEnvironment() {
  return (
    <Environment frames={1} resolution={256}>
      {/* Pure colourless white studio softboxes for crisp crystal reflections */}
      <Lightformer
        form="rect"
        intensity={2.6}
        color="#ffffff"
        position={[0, 7, 2]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[18, 8, 1]}
      />
      <Lightformer
        form="rect"
        intensity={2.8}
        color="#ffffff"
        position={[-9, 1.5, 4]}
        rotation={[0, Math.PI / 2.2, 0]}
        scale={[7, 10, 1]}
      />
      <Lightformer
        form="rect"
        intensity={2.4}
        color="#ffffff"
        position={[9, 1, 3]}
        rotation={[0, -Math.PI / 2.2, 0]}
        scale={[7, 10, 1]}
      />
      <Lightformer
        form="rect"
        intensity={2.0}
        color="#ffffff"
        position={[0, 3, -9]}
        rotation={[0, 0, 0]}
        scale={[16, 6, 1]}
      />
      <Lightformer
        form="rect"
        intensity={1.1}
        color="#ffffff"
        position={[0, -6, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[18, 14, 1]}
      />
    </Environment>
  );
}

function createGlassEdgeFresnelMaterial(strength: number): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uOpacity: { value: 1 },
      uStrength: { value: strength },
    },
    vertexShader: `
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      uniform float uStrength;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      void main() {
        vec3 n = normalize(vNormalView);
        vec3 v = normalize(vViewDir);
        float ndotv = clamp(abs(dot(n, v)), 0.0, 1.0);

        // Pure transparent in flat face center; smooth optical Fresnel reflection on rounded corners & curved bevels
        float fresnel = pow(1.0 - ndotv, 2.35);
        float rimBand = smoothstep(0.22, 0.88, 1.0 - ndotv);

        // Soft studio key + opposite rim specular across rounded arcs (colourless white/pearl)
        vec3 keyDir = normalize(vec3(-0.55, 0.72, 0.42));
        vec3 rimDir = normalize(vec3(0.65, -0.45, 0.58));
        float specular = 0.52
          + 0.48 * pow(max(dot(n, keyDir), 0.0), 3.0)
          + 0.34 * pow(max(dot(n, rimDir), 0.0), 4.0);

        // Subtle optical thickness shading only at deep grazing angle so rounded glass edges separate cleanly
        vec3 glassTone = mix(vec3(0.84, 0.83, 0.81), vec3(1.0), clamp(specular, 0.0, 1.0));
        float alpha = (0.48 * fresnel + 0.16 * rimBand) * uStrength * uOpacity;
        gl_FragColor = vec4(glassTone, clamp(alpha, 0.0, 0.72));
      }
    `,
    transparent: true,
    depthWrite: false,
    side: FrontSide,
  });
}

interface PrismSceneProps {
  categories: readonly ToolkitCategory[];
  totalTools: number;
  totalDisciplines: number;
  framing: CameraFraming;
  progressRef: MutableRefObject<number>;
  trackRef: RefObject<HTMLElement | null>;
  htmlPortalRef: RefObject<HTMLDivElement | null>;
  isSoftwareGl: boolean;
}

function ToolkitPrismScene({
  categories,
  totalTools,
  totalDisciplines,
  framing,
  progressRef,
  trackRef,
  htmlPortalRef,
  isSoftwareGl,
}: PrismSceneProps) {
  const prismGroupRef = useRef<Group | null>(null);
  const outerMatRef = useRef<MeshPhysicalMaterial | null>(null);
  const floorShadowRef = useRef<Mesh | null>(null);
  const floorShadowMatRef = useRef<MeshBasicMaterial | null>(null);
  const frontDomRef = useRef<HTMLDivElement | null>(null);
  const backDomRef = useRef<HTMLDivElement | null>(null);

  const { width, height, depth, radius } = framing.dimensions;

  const outerFresnelMat = useMemo(
    () => createGlassEdgeFresnelMaterial(isSoftwareGl ? 1.0 : 0.72),
    [isSoftwareGl],
  );
  const innerFresnelMat = useMemo(
    () => createGlassEdgeFresnelMaterial(isSoftwareGl ? 0.42 : 0.32),
    [isSoftwareGl],
  );

  useEffect(() => {
    return () => {
      outerFresnelMat.dispose();
      innerFresnelMat.dispose();
    };
  }, [outerFresnelMat, innerFresnelMat]);

  const shadowTexture = useMemo(() => {
    return isSoftwareGl ? createSoftShadowTexture() : null;
  }, [isSoftwareGl]);

  useEffect(() => {
    return () => {
      shadowTexture?.dispose();
    };
  }, [shadowTexture]);

  useFrame(() => {
    const group = prismGroupRef.current;
    if (!group) return;

    const progress = progressRef.current;
    const pose = computeToolkitPrismPose(progress, { isMobile: framing.isMobile });

    group.position.set(0, framing.restingY + pose.translateY, pose.zOffset);
    group.rotation.set(pose.rotateXRad, pose.rotateYRad, 0);
    group.scale.setScalar(pose.scale);
    group.visible = pose.opacity > 0.004;

    if (outerMatRef.current) {
      outerMatRef.current.opacity = isSoftwareGl ? 0.028 * pose.opacity : pose.opacity;
    }
    outerFresnelMat.uniforms.uOpacity.value = pose.opacity;
    innerFresnelMat.uniforms.uOpacity.value = pose.opacity;

    if (frontDomRef.current) {
      frontDomRef.current.style.opacity = `${pose.frontFaceOpacity}`;
      frontDomRef.current.style.visibility = pose.frontFaceOpacity > 0.01 ? 'visible' : 'hidden';
      frontDomRef.current.style.pointerEvents = pose.frontFaceOpacity > 0.6 ? 'auto' : 'none';
    }

    if (backDomRef.current) {
      backDomRef.current.style.opacity = `${pose.backFaceOpacity}`;
      backDomRef.current.style.visibility = pose.backFaceOpacity > 0.01 ? 'visible' : 'hidden';
      backDomRef.current.style.pointerEvents = 'none';
    }

    if (floorShadowRef.current && floorShadowMatRef.current) {
      const cosWidth = 0.25 + 0.75 * Math.abs(Math.cos(pose.rotateYRad));
      floorShadowRef.current.scale.set(
        width * 1.1 * cosWidth * pose.scale,
        depth * 2.1 * pose.scale,
        1,
      );
      const liftFade = Math.max(0, 1 - Math.abs(pose.translateY) / 7.2);
      floorShadowMatRef.current.opacity = 0.42 * pose.opacity * liftFade;
    }

    const trackEl = trackRef.current;
    if (trackEl) {
      trackEl.dataset.scrollProgress = progress.toFixed(3);
      trackEl.dataset.prismStage = pose.stage;
      trackEl.dataset.activeSide = pose.activeSide;
      trackEl.dataset.rotateY = pose.rotateYDeg.toFixed(1);
      trackEl.dataset.scale = pose.scale.toFixed(3);
    }
  });

  const shadowY = framing.restingY - height / 2 - 0.18;
  const embeddedOffsetZ = depth * 0.14;

  return (
    <>
      <color attach="background" args={['#ECEAE2']} />
      <ResponsiveCameraRig framing={framing} />
      <ClearGlassEnvironment />

      {/* Colourless neutral studio lighting — zero surface color tint */}
      <hemisphereLight args={['#ffffff', '#f5f5f5', 1.0]} />
      <directionalLight position={[6, 9, 8]} intensity={1.15} color="#ffffff" />
      <directionalLight position={[-7, 3, -5]} intensity={0.75} color="#ffffff" />

      <group ref={prismGroupRef}>
        {/* Pure Colourless Crystal-Clear Glass Prism Body with distinctly rounded corners */}
        <RoundedBox args={[width, height, depth]} radius={radius} smoothness={8}>
          <meshPhysicalMaterial
            ref={outerMatRef}
            color="#ffffff"
            transmission={isSoftwareGl ? 0 : 0.98}
            ior={1.5}
            thickness={1.2}
            roughness={0.02}
            metalness={isSoftwareGl ? 0.02 : 0}
            reflectivity={0.95}
            clearcoat={1}
            clearcoatRoughness={0.02}
            envMapIntensity={1.55}
            attenuationColor="#ffffff"
            attenuationDistance={Infinity}
            transparent
            opacity={isSoftwareGl ? 0.028 : 1}
            depthWrite={false}
          />
        </RoundedBox>

        {/* Smooth Outer Optical Fresnel Glass Corner & Edge Specular Shell (zero straight/black lines) */}
        <RoundedBox
          args={[width + 0.008, height + 0.008, depth + 0.008]}
          radius={radius}
          smoothness={8}
          material={outerFresnelMat}
        />

        {/* Subtle Inner Wall Fresnel Refraction Shell */}
        <RoundedBox
          args={[width - 0.16, height - 0.16, depth - 0.16]}
          radius={radius * 0.78}
          smoothness={6}
          material={innerFresnelMat}
        />

        {/* Front Face HTML fitted INSIDE the prism (+0.14 * depth inside [-0.5d, +0.5d]) */}
        <Html
          transform
          portal={htmlPortalRef as RefObject<HTMLElement>}
          pointerEvents="none"
          position={[0, 0, embeddedOffsetZ]}
          distanceFactor={framing.htmlDistanceFactor}
          zIndexRange={[20, 1]}
        >
          <ToolkitFaceBoard
            categories={categories}
            totalTools={totalTools}
            totalDisciplines={totalDisciplines}
            isMobile={framing.isMobile}
            containerRef={frontDomRef}
          />
        </Html>

        {/* Back Face HTML fitted INSIDE the prism (-0.14 * depth, horizontally mirrored) */}
        <Html
          transform
          portal={htmlPortalRef as RefObject<HTMLElement>}
          pointerEvents="none"
          position={[0, 0, -embeddedOffsetZ]}
          rotation={[0, Math.PI, 0]}
          distanceFactor={framing.htmlDistanceFactor}
          zIndexRange={[20, 1]}
        >
          <ToolkitFaceBoard
            categories={categories}
            totalTools={totalTools}
            totalDisciplines={totalDisciplines}
            isMobile={framing.isMobile}
            isBackface
            containerRef={backDomRef}
          />
        </Html>
      </group>

      {isSoftwareGl && shadowTexture ? (
        <mesh
          ref={floorShadowRef}
          position={[0, shadowY, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            ref={floorShadowMatRef}
            map={shadowTexture}
            transparent
            opacity={0.65}
            depthWrite={false}
          />
        </mesh>
      ) : (
        <ContactShadows
          position={[0, shadowY, 0]}
          opacity={0.22}
          scale={width * 1.45}
          blur={2.6}
          far={5.5}
          resolution={256}
          color="#26231d"
        />
      )}
    </>
  );
}

export function ToolkitSection({
  categories = TOOLKIT_CATEGORIES,
}: ToolkitSectionProps) {
  const { totalTools, totalDisciplines } = getToolkitStats(categories);
  const trackRef = useRef<HTMLElement | null>(null);
  const progressRef = useRef(0);
  const htmlPortalRef = useRef<HTMLDivElement | null>(null);
  const leftHeadingRef = useRef<HTMLDivElement | null>(null);
  const reducedMotionBoardRef = useRef<HTMLDivElement | null>(null);

  const [reducedMotion, setReducedMotion] = useState(false);
  const [isSoftwareGl] = useState(() => detectSoftwareWebGL());
  const [viewportSize, setViewportSize] = useState(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1440;
    const h = typeof window !== 'undefined' ? window.innerHeight : 900;
    return {
      width: w,
      height: h,
      navbarBottomPx: w < 640 ? 66 : 84,
    };
  });
  const [framing, setFraming] = useState<CameraFraming>(() =>
    computeResponsiveCameraFraming({
      viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 1440,
      viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 900,
    }),
  );

  const leftHeadingLayout = useMemo(
    () =>
      computeToolkitLeftHeadingLayout({
        viewportWidth: viewportSize.width,
        viewportHeight: viewportSize.height,
        framing,
        navbarBottomPx: viewportSize.navbarBottomPx,
      }),
    [viewportSize.width, viewportSize.height, viewportSize.navbarBottomPx, framing],
  );
  const leftHeadingLayoutRef = useRef(leftHeadingLayout);
  leftHeadingLayoutRef.current = leftHeadingLayout;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);

    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateFraming = () => {
      const navEl = document.querySelector('[data-testid="glass-navbar"]');
      const navBottom = navEl ? navEl.getBoundingClientRect().bottom : 88;
      const width = window.innerWidth;
      const height = window.innerHeight;
      const clampedNavBottom = Math.max(60, Math.ceil(navBottom));
      setViewportSize({ width, height, navbarBottomPx: clampedNavBottom });
      setFraming(
        computeResponsiveCameraFraming({
          viewportWidth: width,
          viewportHeight: height,
          navbarHeightPx: Math.max(64, clampedNavBottom),
        }),
      );
      ScrollTrigger.refresh();
    };

    updateFraming();
    window.addEventListener('resize', updateFraming);
    return () => window.removeEventListener('resize', updateFraming);
  }, []);

  const timerClockRef = useRef<ThreeTimerClockAdapter | null>(null);

  useEffect(() => {
    return () => {
      timerClockRef.current?.dispose();
      timerClockRef.current = null;
    };
  }, []);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      ScrollTrigger.refresh();
    });
    return () => window.cancelAnimationFrame(id);
  }, [framing.isMobile, framing.cameraZ]);

  useLayoutEffect(() => {
    const trackEl = trackRef.current;
    const headingEl = leftHeadingRef.current;
    if (!trackEl) return;

    const syncLeftHeadingDom = (rawProgress: number) => {
      const layoutVisible = leftHeadingLayoutRef.current.visible;
      if (!layoutVisible) {
        if (headingEl) {
          headingEl.style.opacity = '0';
          headingEl.style.visibility = 'hidden';
        }
        trackEl.dataset.headingVisible = 'false';
        trackEl.dataset.headingOpacity = '0.000';
        return;
      }

      const pose = computeToolkitLeftHeadingPose(rawProgress);
      if (headingEl) {
        headingEl.style.opacity = `${pose.opacity}`;
        headingEl.style.visibility = pose.visible ? 'visible' : 'hidden';
        headingEl.style.transform = `translate3d(${pose.translateX}px, ${pose.translateY}px, 0)`;
      }
      trackEl.dataset.headingVisible = pose.visible ? 'true' : 'false';
      trackEl.dataset.headingOpacity = pose.opacity.toFixed(3);
    };

    if (reducedMotion) {
      progressRef.current = 0.62;
      trackEl.dataset.scrollProgress = '0.620';
      trackEl.dataset.prismStage = 'presentation';
      trackEl.dataset.activeSide = 'front';
      trackEl.dataset.rotateY = '-360.0';
      syncLeftHeadingDom(0.62);
      return;
    }

    const computeInitialProgress = () => {
      const startOffset = window.innerHeight * 0.6;
      const totalDistance = Math.max(
        1,
        trackEl.offsetHeight - window.innerHeight + startOffset,
      );
      const rect = trackEl.getBoundingClientRect();
      return Math.max(0, Math.min(1, (startOffset - rect.top) / totalDistance));
    };

    const initialProgress = computeInitialProgress();
    progressRef.current = initialProgress;
    syncLeftHeadingDom(initialProgress);
    const proxy = { progress: initialProgress };
    const ctx = gsap.context(() => {
      const tween = gsap.fromTo(
        proxy,
        { progress: 0 },
        {
          progress: 1,
          ease: 'none',
          onUpdate: () => {
            progressRef.current = proxy.progress;
            syncLeftHeadingDom(proxy.progress);
          },
          scrollTrigger: {
            trigger: trackEl,
            start: 'top 60%',
            end: 'bottom bottom',
            scrub: 1.05,
            invalidateOnRefresh: true,
          },
        },
      );
      tween.progress(initialProgress);
      progressRef.current = initialProgress;
      syncLeftHeadingDom(initialProgress);
    }, trackRef);

    const refreshTimer = window.setTimeout(() => {
      ScrollTrigger.refresh();
    }, 180);

    return () => {
      window.clearTimeout(refreshTimer);
      ctx.revert();
    };
  }, [reducedMotion, leftHeadingLayout.visible, leftHeadingLayout.placement]);

  if (reducedMotion) {
    return (
      <section
        ref={trackRef}
        id="toolkit"
        aria-labelledby="toolkit-heading"
        data-testid="toolkit-prism-track"
        data-scroll-progress="0.620"
        data-prism-stage="presentation"
        data-active-side="front"
        data-rotate-y="-360.0"
        data-heading-visible={leftHeadingLayout.visible ? 'true' : 'false'}
        data-heading-opacity={leftHeadingLayout.visible ? '1.000' : '0.000'}
        className="relative z-10 w-full scroll-mt-[84px] sm:scroll-mt-[100px] bg-[#ECEAE2] pt-[96px] sm:pt-[116px] pb-14 px-4 flex flex-col items-center"
      >
        {leftHeadingLayout.visible && leftHeadingLayout.placement === 'left-beside' && (
          <div
            style={{
              left: `${leftHeadingLayout.leftPx}px`,
              top: '144px',
              width: `${leftHeadingLayout.widthPx}px`,
            }}
            className="pointer-events-none absolute z-20"
          >
            <div ref={leftHeadingRef} data-testid="toolkit-left-heading">
              <ToolkitLeftHeadingWordmark
                linesMode={leftHeadingLayout.linesMode}
                lineHeightPx={leftHeadingLayout.wordmarkHeightPx}
                lineGapPx={leftHeadingLayout.lineGapPx}
              />
            </div>
          </div>
        )}

        {leftHeadingLayout.visible && leftHeadingLayout.placement === 'above-prism' && (
          <div
            style={{ width: framing.isMobile ? 356 : 960 }}
            className="max-w-full px-4 sm:px-9 mb-3 pointer-events-none"
          >
            <div ref={leftHeadingRef} data-testid="toolkit-left-heading">
              <ToolkitLeftHeadingWordmark
                linesMode={leftHeadingLayout.linesMode}
                lineHeightPx={leftHeadingLayout.wordmarkHeightPx}
                lineGapPx={leftHeadingLayout.lineGapPx}
              />
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-[#6A0DAD]/25 bg-white/45 backdrop-blur-md shadow-[0_24px_60px_rgba(20,25,26,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] overflow-hidden">
          <ToolkitFaceBoard
            categories={categories}
            totalTools={totalTools}
            totalDisciplines={totalDisciplines}
            isMobile={framing.isMobile}
            containerRef={reducedMotionBoardRef}
          />
        </div>
      </section>
    );
  }

  return (
    <section
      ref={trackRef}
      id="toolkit"
      aria-labelledby="toolkit-heading"
      data-testid="toolkit-prism-track"
      data-scroll-progress="0.000"
      data-prism-stage="entrance"
      data-active-side="edge"
      data-rotate-y="-100.0"
      data-heading-visible="false"
      data-heading-opacity="0.000"
      className="relative z-10 w-full h-[350vh] sm:h-[380vh] lg:h-[420vh] scroll-mt-[84px] sm:scroll-mt-[100px] bg-[#ECEAE2]"
    >
      <div
        data-testid="toolkit-prism-stage"
        className="sticky top-0 h-dvh w-full overflow-hidden z-10"
      >
        <Canvas
          className="block w-full h-full"
          dpr={isSoftwareGl ? 1 : [1, 2]}
          camera={{
            position: [0, 0, framing.cameraZ],
            fov: framing.fovDeg,
            near: 0.1,
            far: 100,
          }}
          gl={{
            antialias: !isSoftwareGl,
            alpha: true,
            powerPreference: 'high-performance',
            toneMapping: ACESFilmicToneMapping,
            toneMappingExposure: 1.05,
          }}
          onCreated={(state) => {
            timerClockRef.current?.dispose();
            const timerClock = createThreeTimerClock(
              typeof document !== 'undefined' ? document : null,
            );
            timerClockRef.current = timerClock;
            state.set({ clock: timerClock as unknown as Clock });
          }}
        >
          <ToolkitPrismScene
            categories={categories}
            totalTools={totalTools}
            totalDisciplines={totalDisciplines}
            framing={framing}
            progressRef={progressRef}
            trackRef={trackRef}
            htmlPortalRef={htmlPortalRef}
            isSoftwareGl={isSoftwareGl}
          />
        </Canvas>
        <div
          ref={htmlPortalRef}
          className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
        />

        {leftHeadingLayout.visible && (
          <div
            style={{
              left: `${leftHeadingLayout.leftPx}px`,
              top: `${leftHeadingLayout.wordmarkTopPx}px`,
              width: `${leftHeadingLayout.widthPx}px`,
            }}
            data-placement={leftHeadingLayout.placement}
            className="pointer-events-none absolute z-20"
          >
            <div
              ref={leftHeadingRef}
              data-testid="toolkit-left-heading"
              style={{
                opacity: 0,
                visibility: 'hidden',
                transform: 'translate3d(-10px, 14px, 0)',
              }}
              className="will-change-[transform,opacity]"
            >
              <ToolkitLeftHeadingWordmark
                linesMode={leftHeadingLayout.linesMode}
                lineHeightPx={leftHeadingLayout.wordmarkHeightPx}
                lineGapPx={leftHeadingLayout.lineGapPx}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default ToolkitSection;
