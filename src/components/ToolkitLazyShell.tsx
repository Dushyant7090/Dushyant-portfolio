import { Suspense, lazy, useEffect, useRef, useState } from 'react';

const LazyToolkitSection = lazy(() => import('./ToolkitSection'));

const TRIGGER_HASHES = new Set(['#toolkit', '#work', '#contact']);

function ToolkitSectionPlaceholder({ reducedMotion }: { reducedMotion: boolean }) {
  if (reducedMotion) {
    return (
      <section
        id="toolkit"
        aria-label="Toolkit"
        data-testid="toolkit-prism-track"
        className="relative z-10 w-full scroll-mt-[84px] sm:scroll-mt-[100px] bg-[#ECEAE2] pt-[96px] sm:pt-[116px] pb-14 px-4 flex justify-center"
      >
        <div
          aria-hidden="true"
          className="w-full max-w-[960px] h-[592px] sm:h-[548px] rounded-2xl border border-black/[0.08] bg-white/35"
        />
      </section>
    );
  }

  return (
    <section
      id="toolkit"
      aria-label="Toolkit"
      data-testid="toolkit-prism-track"
      data-scroll-progress="0.000"
      data-prism-stage="entrance"
      data-active-side="edge"
      className="relative z-10 w-full h-[350vh] sm:h-[380vh] lg:h-[420vh] scroll-mt-[84px] sm:scroll-mt-[100px] bg-[#ECEAE2]"
    >
      <div
        data-testid="toolkit-prism-stage"
        className="sticky top-0 h-dvh w-full overflow-hidden z-10 flex items-center justify-center px-4"
      >
        <div
          aria-hidden="true"
          className="w-[min(92vw,960px)] h-[min(70vh,548px)] rounded-2xl border border-black/[0.06] bg-white/25"
        />
      </div>
    </section>
  );
}

export function ToolkitLazyShell() {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (shouldLoad || typeof window === 'undefined') return;

    const triggerLoad = () => {
      setShouldLoad(true);
    };

    if (TRIGGER_HASHES.has(window.location.hash)) {
      triggerLoad();
      return;
    }

    const onHashChange = () => {
      if (TRIGGER_HASHES.has(window.location.hash)) {
        triggerLoad();
      }
    };
    window.addEventListener('hashchange', onHashChange);

    const sentinel = sentinelRef.current;
    if (sentinel) {
      const rect = sentinel.getBoundingClientRect();
      if (rect.top <= window.innerHeight + 1200) {
        triggerLoad();
        return () => window.removeEventListener('hashchange', onHashChange);
      }
    }

    let observer: IntersectionObserver | null = null;
    if (sentinel && typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            triggerLoad();
          }
        },
        { rootMargin: '1200px 0px' },
      );
      observer.observe(sentinel);
    } else {
      triggerLoad();
    }

    return () => {
      window.removeEventListener('hashchange', onHashChange);
      observer?.disconnect();
    };
  }, [shouldLoad]);

  if (!shouldLoad) {
    return (
      <div ref={sentinelRef}>
        <ToolkitSectionPlaceholder reducedMotion={reducedMotion} />
      </div>
    );
  }

  return (
    <Suspense fallback={<ToolkitSectionPlaceholder reducedMotion={reducedMotion} />}>
      <LazyToolkitSection />
    </Suspense>
  );
}
