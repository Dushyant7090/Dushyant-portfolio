import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, ArrowUpRight, X } from 'lucide-react';
import {
  WORK_PROJECTS,
  formatProjectCountLabel,
  getCaseStudyNeighbors,
  type WorkProject,
} from '../data/work';
import { WorkProjectPreview } from './WorkPreviews';

function GitHubMark() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M12 1.5C6.2 1.5 1.5 6.2 1.5 12c0 4.64 3.01 8.58 7.18 9.97.52.1.72-.23.72-.51v-1.78c-2.92.63-3.54-1.41-3.54-1.41-.48-1.22-1.17-1.54-1.17-1.54-.95-.65.07-.64.07-.64 1.06.07 1.61 1.09 1.61 1.09.94 1.61 2.46 1.14 3.06.87.09-.68.37-1.14.67-1.4-2.33-.26-4.78-1.17-4.78-5.19 0-1.15.41-2.09 1.08-2.82-.11-.26-.47-1.33.1-2.78 0 0 .88-.28 2.89 1.08A10.1 10.1 0 0 1 12 6.57c.89 0 1.79.12 2.63.35 2.01-1.36 2.89-1.08 2.89-1.08.57 1.45.21 2.52.1 2.78.67.73 1.08 1.67 1.08 2.82 0 4.03-2.46 4.92-4.8 5.18.38.33.72.97.72 1.96v2.9c0 .28.19.62.73.51A10.51 10.51 0 0 0 22.5 12c0-5.8-4.7-10.5-10.5-10.5Z" />
    </svg>
  );
}

interface CaseStudyModalProps {
  project: WorkProject;
  onClose: () => void;
  onSelectProject: (id: WorkProject['id']) => void;
}

function CaseStudyModal({ project, onClose, onSelectProject }: CaseStudyModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const { prev, next } = getCaseStudyNeighbors(WORK_PROJECTS, project.id);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 10);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  if (!project.caseStudy || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#111315]/55 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="case-study-modal-title"
      data-testid="case-study-modal"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-[920px] max-h-[90vh] overflow-y-auto rounded-2xl bg-[#ECEAE2] text-[#14191A] border border-black/[0.12] shadow-[0_32px_80px_rgba(17,19,21,0.28)]">
        {/* Top bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-5 sm:px-8 py-4 bg-[#ECEAE2]/92 backdrop-blur-md border-b border-black/[0.10]">
          <div className="flex items-center gap-2.5 font-mono text-[11px] sm:text-[12px] tracking-[0.14em] uppercase">
            <span className="text-[#6A0DAD] font-semibold tabular-nums">{project.index}</span>
            <span className="text-[#14191A]/30">/</span>
            <span className="text-[#14191A]/75">{project.category}</span>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close case study"
            className="inline-flex items-center justify-center gap-1.5 min-h-[44px] min-w-[44px] px-3 rounded-lg border border-black/[0.14] bg-white/55 hover:bg-white text-[#111315] text-[13px] font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111315]"
          >
            <span className="hidden sm:inline">Close</span>
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 sm:px-8 py-7 sm:py-9 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-start">
            <div className="md:col-span-6 space-y-3">
              <h3
                id="case-study-modal-title"
                className="font-display text-[28px] sm:text-[36px] font-bold tracking-[-0.025em] leading-[1.08] text-[#111315]"
              >
                {project.title}
              </h3>
              <p className="text-[14px] font-medium text-[#14191A]/60">{project.role}</p>
              <p className="text-[15.5px] leading-[1.65] text-[#14191A]/85 pt-1">
                {project.summary}
              </p>
              <p className="text-[14.5px] leading-[1.6] text-[#14191A]/72">
                {project.outcomeNote}
              </p>
            </div>

            <div className="md:col-span-6 aspect-[16/10] rounded-xl overflow-hidden border border-black/[0.08] shadow-[0_8px_24px_rgba(17,19,21,0.06)]">
              <WorkProjectPreview projectId={project.id} />
            </div>
          </div>

          {project.metrics.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-y border-black/[0.10] py-5">
              {project.metrics.map((metric) => (
                <div key={metric.label}>
                  <div className="font-display text-[22px] sm:text-[26px] font-bold tracking-[-0.02em] text-[#111315] tabular-nums">
                    {metric.value}
                  </div>
                  <div className="mt-1 font-mono text-[10.5px] tracking-[0.12em] uppercase text-[#14191A]/60">
                    {metric.label}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
            <div className="md:col-span-5 space-y-2.5">
              <h4 className="font-mono text-[11px] tracking-[0.16em] uppercase text-[#6A0DAD] font-semibold">
                Problem Framing
              </h4>
              <p className="text-[15px] leading-[1.65] text-[#14191A]/82">
                {project.caseStudy.challenge}
              </p>

              <div className="pt-3">
                <h4 className="font-mono text-[11px] tracking-[0.16em] uppercase text-[#14191A]/55 font-semibold">
                  Outcome
                </h4>
                <p className="mt-2 text-[15px] leading-[1.65] text-[#14191A]/85">
                  {project.caseStudy.outcomeSummary}
                </p>
              </div>
            </div>

            <div className="md:col-span-7 space-y-3">
              <h4 className="font-mono text-[11px] tracking-[0.16em] uppercase text-[#14191A]/55 font-semibold">
                Engineering &amp; Architecture
              </h4>
              <ol className="divide-y divide-black/[0.08] border-y border-black/[0.08]">
                {project.caseStudy.architectureSteps.map((step, idx) => (
                  <li key={step} className="py-3 flex items-start gap-3.5">
                    <span className="font-mono text-[11px] tracking-[0.12em] text-[#6A0DAD] font-semibold tabular-nums pt-1">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="text-[14.5px] leading-[1.6] text-[#14191A]/85">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Modal footer */}
          <div className="pt-4 border-t border-black/[0.10] flex flex-wrap items-center justify-between gap-4">
            <a
              href={project.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-[#111315] hover:bg-black text-white text-[13.5px] font-medium px-5 py-2.5 min-h-[44px] rounded-lg whitespace-nowrap shrink-0 transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111315]"
            >
              <span>View Repository on GitHub</span>
              <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
            </a>

            <div className="flex items-center gap-2.5">
              {prev && (
                <button
                  type="button"
                  onClick={() => onSelectProject(prev.id)}
                  className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-lg border border-black/[0.14] bg-white/50 hover:bg-white text-[13px] font-medium text-[#111315] whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111315]"
                >
                  <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Prev: {prev.title}</span>
                </button>
              )}
              {next && (
                <button
                  type="button"
                  onClick={() => onSelectProject(next.id)}
                  className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-lg border border-black/[0.14] bg-white/50 hover:bg-white text-[13px] font-medium text-[#111315] whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111315]"
                >
                  <span>Next: {next.title}</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function WorkSection() {
  const [activeCaseId, setActiveCaseId] = useState<WorkProject['id'] | null>(null);

  const activeCaseProject = activeCaseId
    ? WORK_PROJECTS.find((item) => item.id === activeCaseId && item.hasCaseStudy) ?? null
    : null;

  const countLabel = formatProjectCountLabel(WORK_PROJECTS.length);
  const [, ...countWords] = countLabel.split(' ');

  return (
    <section
      id="work"
      aria-labelledby="work-heading"
      data-testid="work-section"
      className="relative z-20 bg-[#ECEAE2] text-[#14191A] scroll-mt-[84px] sm:scroll-mt-[100px] border-t border-black/[0.10]"
    >
      <div className="max-w-[1320px] mx-auto px-4 sm:px-8 md:px-10 py-14 sm:py-22 lg:py-28">
        {/* Top Editorial Header: WORK on left, PROJECTS on right */}
        <header className="flex flex-wrap items-end justify-between gap-4 pb-6 sm:pb-8 lg:pb-9 border-b border-black/[0.12]">
          <h2
            id="work-heading"
            className="font-display text-[40px] sm:text-[56px] md:text-[64px] lg:text-[78px] font-bold tracking-[-0.035em] leading-[0.94] text-[#111315]"
          >
            WORK
          </h2>

          <p className="font-mono text-[12.5px] sm:text-[13.5px] lg:text-[14px] tracking-[0.16em] uppercase text-[#14191A]/75 pb-1 sm:pb-2">
            {countWords.join(' ') || 'PROJECTS'}
          </p>
        </header>

        {/* Horizontal Frosted-Glass Showcase Cards */}
        <div className="mt-8 sm:mt-10 space-y-6 sm:space-y-7">
          {WORK_PROJECTS.map((project) => (
            <article
              key={project.id}
              data-testid={`work-project-${project.id}`}
              className="group glass-project-card rounded-[24px] sm:rounded-[28px] p-4 sm:p-5 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 lg:gap-7 items-stretch"
            >
              {/* Left Column: Crisp Interactive Preview */}
              <div className="lg:col-span-5 flex">
                {project.hasCaseStudy ? (
                  <button
                    type="button"
                    onClick={() => setActiveCaseId(project.id)}
                    aria-label={`Read the ${project.title} case study`}
                    className="group/preview relative w-full aspect-[16/10] lg:aspect-auto lg:min-h-[214px] rounded-[16px] sm:rounded-[18px] overflow-hidden border border-white/80 ring-1 ring-black/[0.06] shadow-[0_8px_22px_rgba(17,19,21,0.06)] text-left focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#6A0DAD]"
                  >
                    <div className="w-full h-full transition-transform duration-300 ease-out group-hover/preview:scale-[1.015] group-data-[touch-hover=true]/preview:scale-[1.015]">
                      <WorkProjectPreview projectId={project.id} />
                    </div>
                  </button>
                ) : (
                  <a
                    href={project.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${project.title} GitHub profile`}
                    className="group/preview relative w-full aspect-[16/10] lg:aspect-auto lg:min-h-[214px] rounded-[16px] sm:rounded-[18px] overflow-hidden border border-white/80 ring-1 ring-black/[0.06] shadow-[0_8px_22px_rgba(17,19,21,0.06)] block focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#6A0DAD]"
                  >
                    <div className="w-full h-full transition-transform duration-300 ease-out group-hover/preview:scale-[1.015] group-data-[touch-hover=true]/preview:scale-[1.015]">
                      <WorkProjectPreview projectId={project.id} />
                    </div>
                  </a>
                )}
              </div>

              {/* Right Column: Editorial Metadata, Narrative, Metrics, Stack & Inline Actions */}
              <div className="lg:col-span-7 flex flex-col justify-between gap-4 py-0.5">
                <div className="space-y-2.5">
                  {/* Top Category & Optional Featured Tag */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-mono text-[11px] sm:text-[11.5px] tracking-[0.14em] uppercase">
                      <span className="text-[#6A0DAD] font-semibold tabular-nums">
                        {project.index}
                      </span>
                      <span aria-hidden="true" className="text-[#14191A]/30">
                        /
                      </span>
                      <span className="text-[#6A0DAD] font-semibold">{project.category}</span>
                    </div>

                    {project.featured && (
                      <span className="inline-flex items-center rounded-md border border-[#6A0DAD]/55 bg-[#6A0DAD]/[0.07] px-2.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.14em] uppercase text-[#6A0DAD]">
                        FEATURED
                      </span>
                    )}
                  </div>

                  {/* Title & Role */}
                  <div>
                    <h3 className="font-display text-[24px] sm:text-[28px] lg:text-[31px] font-bold tracking-[-0.025em] leading-[1.12] text-[#111315] text-balance">
                      {project.title}
                    </h3>
                    <p className="mt-1 text-[13.5px] font-medium text-[#14191A]/56">
                      {project.role}
                    </p>
                  </div>

                  {/* Concise Summary */}
                  <p className="max-w-[66ch] text-[14.5px] sm:text-[15.5px] leading-[1.58] text-[#14191A]/80">
                    {project.cardSummary}
                  </p>

                  {/* Metrics Row (Project 01) */}
                  {project.metrics.length > 0 && (
                    <dl className="pt-1.5 grid grid-cols-2 sm:grid-cols-4 gap-y-3 sm:divide-x sm:divide-black/[0.11]">
                      {project.metrics.map((metric, idx) => (
                        <div
                          key={metric.label}
                          className={`flex flex-col-reverse justify-end ${
                            idx > 0 ? 'sm:pl-5' : ''
                          } sm:pr-4`}
                        >
                          <dt className="mt-0.5 text-[11.5px] font-medium text-[#14191A]/62">
                            {metric.label}
                          </dt>
                          <dd className="font-display text-[19px] sm:text-[21px] font-bold tracking-[-0.02em] text-[#111315] tabular-nums leading-tight">
                            {metric.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>

                {/* Bottom Row: Subtle Stack Tags on Left, Inline Links on Right */}
                <div className="pt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-black/[0.07]">
                  <ul
                    aria-label={`${project.title} technologies`}
                    className="flex flex-wrap items-center gap-1.5"
                  >
                    {project.stack.map((tech) => (
                      <li
                        key={tech}
                        className="rounded-md border border-black/[0.09] bg-white/55 px-2 py-0.5 font-mono text-[10.5px] font-medium text-[#14191A]/82 whitespace-nowrap shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]"
                      >
                        {tech}
                      </li>
                    ))}
                  </ul>

                  <div className="flex items-center gap-3 shrink-0">
                    <a
                      href={project.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group/link inline-flex items-center gap-1.5 min-h-[40px] text-[13px] font-medium text-[#111315] hover:text-[#6A0DAD] data-[touch-hover=true]:text-[#6A0DAD] transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6A0DAD]"
                    >
                      <GitHubMark />
                      <span>GitHub</span>
                      <ArrowUpRight
                        className="w-3.5 h-3.5 opacity-60 group-hover/link:opacity-100 group-data-[touch-hover=true]/link:opacity-100 transition-transform duration-150 group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5 group-data-[touch-hover=true]/link:-translate-y-0.5 group-data-[touch-hover=true]/link:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </a>

                    <span className="h-4 w-px bg-black/[0.15]" aria-hidden="true" />

                    {project.hasCaseStudy ? (
                      <button
                        type="button"
                        onClick={() => setActiveCaseId(project.id)}
                        className="group/link inline-flex items-center gap-1 min-h-[40px] text-[13px] font-medium text-[#111315] hover:text-[#6A0DAD] data-[touch-hover=true]:text-[#6A0DAD] transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6A0DAD]"
                      >
                        <span>Read the Case</span>
                        <ArrowUpRight
                          className="w-3.5 h-3.5 opacity-60 group-hover/link:opacity-100 group-data-[touch-hover=true]/link:opacity-100 transition-transform duration-150 group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5 group-data-[touch-hover=true]/link:-translate-y-0.5 group-data-[touch-hover=true]/link:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </button>
                    ) : (
                      <a
                        href={project.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group/link inline-flex items-center gap-1 min-h-[40px] text-[13px] font-medium text-[#111315] hover:text-[#6A0DAD] data-[touch-hover=true]:text-[#6A0DAD] transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6A0DAD]"
                      >
                        <span>View Contribution</span>
                        <ArrowUpRight
                          className="w-3.5 h-3.5 opacity-60 group-hover/link:opacity-100 group-data-[touch-hover=true]/link:opacity-100 transition-transform duration-150 group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5 group-data-[touch-hover=true]/link:-translate-y-0.5 group-data-[touch-hover=true]/link:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {activeCaseProject && (
        <CaseStudyModal
          project={activeCaseProject}
          onClose={() => setActiveCaseId(null)}
          onSelectProject={(id) => setActiveCaseId(id)}
        />
      )}
    </section>
  );
}
