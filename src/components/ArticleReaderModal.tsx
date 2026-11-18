import React, { useEffect } from 'react';
import { ArrowLeft, ArrowUpRight, Atom, BookOpen, Clock, X } from 'lucide-react';
import { ResumeData, ResumeResearchArticle } from '../data/resume';

interface ArticleReaderModalProps {
  resume: ResumeData;
  articleIdx: 0 | 1 | null;
  onSelectArticle: (idx: 0 | 1) => void;
  onClose: () => void;
}

export const ArticleReaderModal: React.FC<ArticleReaderModalProps> = ({
  resume,
  articleIdx,
  onSelectArticle,
  onClose,
}) => {
  useEffect(() => {
    if (articleIdx === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [articleIdx, onClose]);

  if (articleIdx === null) return null;

  const article: ResumeResearchArticle | undefined = resume.research[articleIdx];
  if (!article) return null;

  const ui = resume.ui;
  const otherIdx: 0 | 1 = articleIdx === 0 ? 1 : 0;
  const otherArticle = resume.research[otherIdx];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quantum-article-title"
      className="fixed inset-0 z-50 flex flex-col bg-[#05090E]/96 backdrop-blur-xl text-[#FFFFFF] overflow-hidden"
    >
      {/* Top Reader Navigation Bar */}
      <header className="flex items-center justify-between gap-3 border-b border-[#00FFFF]/25 bg-[#070E16]/90 px-4 py-3 sm:px-8 sm:py-4 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 border border-[#00FFFF]/45 bg-[#0A1822]/85 px-3 py-1.5 font-mono-hud text-[10px] sm:text-[11px] tracking-[0.16em] text-[#D8FFFF] hover:border-[#00FFFF] hover:bg-[#00FFFF]/15 hover:text-[#FFFFFF] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#00FFFF]"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#00FFFF]" />
          <span>{ui.backToKnowledge}</span>
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          {otherArticle && (
            <div className="inline-flex items-center border border-[#00FFFF]/35 bg-[#08121B] p-0.5 font-mono-hud text-[10px]">
              {([0, 1] as const).map((idx) => {
                const item = resume.research[idx];
                if (!item) return null;
                const active = idx === articleIdx;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectArticle(idx)}
                    className={`px-2.5 py-1 tracking-widest transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#00FFFF] text-[#050C14] font-semibold'
                        : 'text-[#8FA4B5] hover:text-[#FFFFFF]'
                    }`}
                  >
                    {item.stateNumber}
                  </button>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label={ui.closeModal}
            className="flex h-8 w-8 items-center justify-center border border-[#8A929A]/40 bg-[#0A131C] text-[#CBD5E1] hover:border-[#00FFFF] hover:text-[#00FFFF] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#00FFFF]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Scrollable Article Content Body */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-10">
        <article className="mx-auto max-w-[760px] space-y-6">
          {/* Quantum State Header & Metadata */}
          <div className="space-y-4 border-b border-[#00FFFF]/20 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2 border border-[#00FFFF]/55 bg-[#00FFFF]/10 px-3 py-1 font-mono-hud text-[10px] tracking-[0.18em] text-[#00FFFF]">
                <Atom className="w-3.5 h-3.5" />
                <span>
                  {ui.stateLabel} {article.stateNumber} // {article.statusLabel}
                </span>
              </div>

              <div className="inline-flex items-center gap-3 font-mono-hud text-[11px] text-[#9CA6B0]">
                <span>
                  {article.venue} · {article.year}
                </span>
                <span aria-hidden="true" className="text-[#8A929A]/40">|</span>
                <span className="inline-flex items-center gap-1.5 text-[#D8FFFF]">
                  <Clock className="w-3.5 h-3.5 text-[#00FFFF]" />
                  {article.readingTime}
                </span>
              </div>
            </div>

            <h1
              id="quantum-article-title"
              className="font-display-hud text-2xl sm:text-3xl md:text-4xl font-medium tracking-tight text-[#FFFFFF] leading-tight"
            >
              {article.title}
            </h1>

            <div className="flex flex-wrap items-center gap-2">
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="border border-[#8A929A]/35 bg-[#0A131C] px-2.5 py-0.5 font-mono-hud text-[10px] tracking-wider text-[#BFEFFF]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Placeholder Banner Notice (when draft placeholder sections are active) */}
          {article.sections.some((s) => s.isPlaceholder) && (
            <div className="flex items-start gap-3 border border-[#00FFFF]/35 bg-[#081722]/85 px-4 py-3 font-mono-hud text-[10.5px] tracking-wider text-[#B6F7FF]">
              <BookOpen className="w-4 h-4 text-[#00FFFF] shrink-0 mt-0.5" />
              <span>{ui.placeholderNotice}</span>
            </div>
          )}

          {/* Abstract Card */}
          <section className="relative border border-[#00FFFF]/35 bg-[#081018]/90 p-5 sm:p-6 space-y-2">
            <span aria-hidden="true" className="pointer-events-none absolute -top-[1px] -left-[1px] h-3 w-3 border-t-2 border-l-2 border-[#00FFFF]" />
            <span aria-hidden="true" className="pointer-events-none absolute -bottom-[1px] -right-[1px] h-3 w-3 border-b-2 border-r-2 border-[#00FFFF]" />
            <p className="font-mono-hud text-[10px] tracking-[0.2em] text-[#00FFFF]">
              ABSTRACT // OVERVIEW
            </p>
            <p className="text-sm sm:text-base leading-relaxed text-[#E4EFF5]">
              {article.abstract}
            </p>
          </section>

          {/* Article Sections */}
          <div className="space-y-5">
            {article.sections.map((section) => (
              <section
                key={section.heading}
                className="border border-[#8A929A]/25 bg-[#070C13]/85 p-5 sm:p-6 space-y-2.5"
              >
                <h2 className="font-mono-hud text-xs tracking-[0.16em] text-[#00FFFF]">
                  {section.heading}
                </h2>
                <p className="text-sm sm:text-[15px] leading-relaxed text-[#CBD5E1]">
                  {section.body}
                </p>
              </section>
            ))}
          </div>

          {/* Footer Actions */}
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#8A929A]/25 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 border border-[#00FFFF]/50 bg-[#08141E] px-4 py-2 font-mono-hud text-[11px] tracking-wider text-[#D8FFFF] hover:border-[#00FFFF] hover:bg-[#00FFFF]/15 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#00FFFF]" />
              <span>{ui.backToKnowledge}</span>
            </button>

            {article.url && (
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#00FFFF] px-4 py-2 font-mono-hud text-[11px] font-semibold tracking-wider text-[#050C14] hover:bg-[#D8FFFF] transition-colors"
              >
                <span>{ui.externalManuscript}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            )}
          </footer>
        </article>
      </div>
    </div>
  );
};
