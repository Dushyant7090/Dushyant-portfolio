import { useEffect, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';

export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className="fixed top-2.5 sm:top-4 inset-x-0 z-40 flex justify-center pointer-events-none">
      <div
        data-testid="glass-navbar"
        data-scrolled={scrolled ? 'true' : 'false'}
        className={`relative overflow-hidden pointer-events-auto w-[94%] sm:w-[92%] max-w-[1320px] rounded-2xl border backdrop-blur-[14px] backdrop-saturate-[190%] backdrop-brightness-[1.02] transition-[background-color,border-color,box-shadow] duration-300 ease-out ${
          scrolled
            ? 'bg-white/[0.14] border-white/55 ring-1 ring-black/[0.08] shadow-[0_14px_38px_rgba(20,25,26,0.10),0_2px_6px_rgba(20,25,26,0.04),inset_0_1px_1.5px_rgba(255,255,255,0.92),inset_0_-1px_1px_rgba(255,255,255,0.32)]'
            : 'bg-white/[0.08] border-white/50 ring-1 ring-black/[0.06] shadow-[0_8px_28px_rgba(20,25,26,0.06),0_1px_3px_rgba(20,25,26,0.03),inset_0_1px_1.5px_rgba(255,255,255,0.88),inset_0_-1px_1px_rgba(255,255,255,0.24)]'
        }`}
      >
        {/* Translucent optical glass sheen & top edge specular reflection */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.22] via-transparent to-white/[0.08]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/95 to-transparent"
        />

        <div className="relative z-10 flex items-center justify-between gap-2 sm:gap-6 md:gap-8 px-3.5 sm:px-6 md:px-8 lg:px-10 py-2 sm:py-2.5 md:py-3">
          <a
            href="#top"
            className="font-display text-[11.5px] sm:text-[15px] md:text-[17px] lg:text-[19px] font-bold tracking-[-0.02em] text-[#111315] uppercase whitespace-nowrap shrink-0 min-h-[40px] inline-flex items-center transition-opacity duration-200 hover:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#111315]"
          >
            DUSHYANT BENIWAL
          </a>

          <nav
            aria-label="Primary navigation"
            className="flex items-center gap-2.5 sm:gap-5 md:gap-7 lg:gap-9 shrink-0"
          >
            <a
              href="#work"
              className="relative text-[12px] sm:text-[13.5px] md:text-[14px] font-medium text-[#111315]/90 hover:text-[#111315] data-[touch-hover=true]:text-[#111315] transition-colors duration-200 whitespace-nowrap shrink-0 min-h-[40px] inline-flex items-center px-1 after:content-[''] after:absolute after:left-1 after:right-1 after:bottom-1.5 after:h-px after:bg-[#111315] after:scale-x-0 hover:after:scale-x-100 data-[touch-hover=true]:after:scale-x-100 after:origin-left after:transition-transform after:duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#111315]"
            >
              Work
            </a>
            <a
              href="#about"
              className="relative text-[12px] sm:text-[13.5px] md:text-[14px] font-medium text-[#111315]/90 hover:text-[#111315] data-[touch-hover=true]:text-[#111315] transition-colors duration-200 whitespace-nowrap shrink-0 min-h-[40px] inline-flex items-center px-1 after:content-[''] after:absolute after:left-1 after:right-1 after:bottom-1.5 after:h-px after:bg-[#111315] after:scale-x-0 hover:after:scale-x-100 data-[touch-hover=true]:after:scale-x-100 after:origin-left after:transition-transform after:duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#111315]"
            >
              About
            </a>
            <a
              href="#contact"
              className="inline-flex items-center justify-center gap-1 sm:gap-1.5 bg-[rgb(218,72,24)] hover:bg-[rgb(196,62,18)] data-[touch-hover=true]:bg-[rgb(196,62,18)] text-white text-[11.5px] sm:text-[13px] md:text-[13.5px] font-medium px-3 sm:px-5 md:px-6 py-2 sm:py-2.5 rounded-lg transition-all duration-200 hover:-translate-y-0.5 data-[touch-hover=true]:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(218,72,24,0.28)] data-[touch-hover=true]:shadow-[0_6px_16px_rgba(218,72,24,0.28)] motion-reduce:hover:translate-y-0 whitespace-nowrap shrink-0 min-h-[40px] sm:min-h-[42px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(218,72,24)]"
            >
              <span>Let&apos;s talk</span>
              <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}
