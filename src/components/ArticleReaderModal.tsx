import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, BookOpen, X } from 'lucide-react';
import { ResumeData, ResumeResearchArticle } from '../data/resume';

interface ArticleReaderModalProps {
  resume: ResumeData;
  articleIdx: number | null;
  onSelectArticle: (idx: number) => void;
  onClose: () => void;
}

export const ArticleReaderModal: React.FC<ArticleReaderModalProps> = ({
  resume,
  articleIdx,
  onSelectArticle,
  onClose,
}) => {
  const [heroFailed, setHeroFailed] = useState(false);

  const articles = resume.research;
  const article: ResumeResearchArticle | undefined =
    articleIdx !== null ? articles[articleIdx] : undefined;

  useEffect(() => {
    setHeroFailed(false);
  }, [article?.imageUrl]);

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

  if (articleIdx === null || !article) return null;

  const ui = resume.ui;

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
          className="inline-flex min-h-[38px] items-center gap-2 border border-[#00FFFF]/45 bg-[#0A1822]/85 px-3.5 py-1.5 font-mono-hud text-[10px] sm:text-[11px] tracking-[0.16em] text-[#D8FFFF] hover:border-[#00FFFF] hover:bg-[#00FFFF]/15 hover:text-[#FFFFFF] transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#00FFFF]"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#00FFFF]" />
          <span>{ui.backToKnowledge}</span>
        </button>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {articles.length > 1 && (
            <div className="inline-flex items-center border border-[#00FFFF]/35 bg-[#08121B] p-0.5 font-mono-hud text-[10px]">
              {articles.map((item, idx) => {
                const active = idx === articleIdx;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onSelectArticle(idx)}
                    className={`px-3 py-1 tracking-widest transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-[#00FFFF] ${
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
            className="flex h-9 w-9 items-center justify-center border border-[#8A929A]/40 bg-[#0A131C] text-[#CBD5E1] hover:border-[#00FFFF] hover:text-[#00FFFF] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#00FFFF]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Scrollable Article Content Body */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-10">
        <article className="mx-auto max-w-[780px] space-y-6">
          {/* Article Artwork Showcase Banner */}
          {article.imageUrl && !heroFailed && (
            <div className="relative aspect-[16/9] w-full overflow-hidden border border-[#00FFFF]/40 bg-[#04080D] shadow-[0_24px_60px_rgba(0,0,0,0.85),0_0_36px_rgba(0,255,255,0.12)]">
              <img
                src={article.imageUrl}
                alt={article.imageAlt || article.title}
                referrerPolicy="no-referrer"
                onError={() => setHeroFailed(true)}
                className="h-full w-full object-cover"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-0 left-0 h-4 w-4 border-t-2 border-l-2 border-[#00FFFF]"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-[#00FFFF]"
              />
            </div>
          )}

          {/* Quantum State Header & Clean Unboxed Metadata */}
          <div className="space-y-3 border-b border-[#00FFFF]/20 pb-6">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono-hud text-[11px] tracking-[0.14em] text-[#9CA6B0]">
              <span className="font-semibold text-[#00FFFF]">
                {ui.stateLabel} {article.stateNumber}
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-[#D8FFFF]">{article.statusLabel}</span>
              <span aria-hidden="true">·</span>
              <span>{article.venue}</span>
              <span aria-hidden="true">·</span>
              <span>{article.year}</span>
              <span aria-hidden="true">·</span>
              <span className="text-[#D8FFFF]">{article.readingTime}</span>
            </div>

            <h1
              id="quantum-article-title"
              style={{ textWrap: 'balance' }}
              className="font-display-hud text-2xl sm:text-3xl md:text-4xl font-medium tracking-tight text-[#FFFFFF] leading-tight"
            >
              {article.title}
            </h1>

            <p className="font-mono-hud text-[11px] tracking-[0.16em] text-[#9BBCD0]">
              {article.tags.join(' · ')}
            </p>
          </div>

          {/* Placeholder Banner Notice (when draft placeholder sections are active) */}
          {article.sections.some((s) => s.isPlaceholder) && (
            <div className="flex items-start gap-3 border border-[#00FFFF]/35 bg-[#081722]/85 px-4 py-3 font-mono-hud text-[10.5px] tracking-wider text-[#B6F7FF]">
              <BookOpen className="w-4 h-4 text-[#00FFFF] shrink-0 mt-0.5" />
              <span>{ui.placeholderNotice}</span>
            </div>
          )}

          {/* Abstract Section */}
          <section className="relative border border-[#00FFFF]/35 bg-[#081018]/90 p-5 sm:p-6 space-y-2">
            <span aria-hidden="true" className="pointer-events-none absolute -top-[1px] -left-[1px] h-3 w-3 border-t-2 border-l-2 border-[#00FFFF]" />
            <span aria-hidden="true" className="pointer-events-none absolute -bottom-[1px] -right-[1px] h-3 w-3 border-b-2 border-r-2 border-[#00FFFF]" />
            <p className="font-mono-hud text-[10px] tracking-[0.2em] text-[#00FFFF]">
              Abstract Overview
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
                <h2 className="font-mono-hud text-xs tracking-[0.14em] text-[#00FFFF]">
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
              className="inline-flex min-h-[40px] items-center gap-2 border border-[#00FFFF]/50 bg-[#08141E] px-4 py-2 font-mono-hud text-[11px] tracking-wider text-[#D8FFFF] hover:border-[#00FFFF] hover:bg-[#00FFFF]/15 transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-[#00FFFF]"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#00FFFF]" />
              <span>{ui.backToKnowledge}</span>
            </button>

            {article.url && (
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[40px] items-center gap-2 bg-[#00FFFF] px-4 py-2 font-mono-hud text-[11px] font-semibold tracking-wider text-[#050C14] hover:bg-[#D8FFFF] transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-[#FFFFFF]"
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
