import React, { useEffect } from 'react';
import { ArrowRight, Atom, Clock, Cpu } from 'lucide-react';
import { ResumeData, ResumeResearchArticle } from '../data/resume';

interface QuantumKnowledgeHudProps {
  resume: ResumeData;
  revealAmount: number;
  enterT: number;
  activeArticleIdx: number;
  onSelectArticle: (idx: number) => void;
  onReadArticle: (idx: number) => void;
}

/**
 * Razor-sharp octagonal / chamfered holographic border frame rendered via SVG
 * so 1px glowing cyan edges stay crisp at any width without clip-path clipping.
 */
const ChamferOutlineSvg: React.FC<{
  chamfer?: number;
  strokeColor?: string;
  fillColor?: string;
  className?: string;
}> = ({
  chamfer = 10,
  strokeColor = 'rgba(0, 255, 255, 0.55)',
  fillColor = 'rgba(6, 15, 22, 0.72)',
  className = '',
}) => (
  <svg
    aria-hidden="true"
    preserveAspectRatio="none"
    viewBox="0 0 200 44"
    className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
  >
    <polygon
      points={`${chamfer},1 ${200 - chamfer},1 199,22 ${200 - chamfer},43 ${chamfer},43 1,22`}
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth="1.25"
      vectorEffect="non-scaling-stroke"
    />
  </svg>
);

export const QuantumKnowledgeHud: React.FC<QuantumKnowledgeHudProps> = ({
  resume,
  revealAmount,
  enterT,
  activeArticleIdx,
  onSelectArticle,
  onReadArticle,
}) => {
  const articles = resume.research;
  const count = articles.length;
  const safeActiveIdx = count > 0 ? ((activeArticleIdx % count) + count) % count : 0;
  const activeArticle: ResumeResearchArticle | undefined = articles[safeActiveIdx];
  const ui = resume.ui;

  useEffect(() => {
    if (revealAmount <= 0.4 || count < 2) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === 'ArrowRight') {
        onSelectArticle((safeActiveIdx + 1) % count);
      } else if (e.key === 'ArrowLeft') {
        onSelectArticle((safeActiveIdx - 1 + count) % count);
      } else if (e.key === '1') {
        onSelectArticle(0);
      } else if (e.key === '2' && count >= 2) {
        onSelectArticle(1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [count, onSelectArticle, revealAmount, safeActiveIdx]);

  if (!activeArticle || revealAmount <= 0.01) return null;

  const firstTag = activeArticle.tags[0] ?? activeArticle.venue;
  const secondTag = activeArticle.tags[1] ?? activeArticle.year;

  return (
    <div
      aria-live="polite"
      style={{
        opacity: revealAmount,
        transform: `translate3d(0, ${((1 - enterT) * 10).toFixed(1)}px, 0)`,
      }}
      className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-between px-4 pt-[58px] pb-[66px] sm:px-7 sm:pt-7 sm:pb-[80px]"
    >
      {/* ================================================================= */}
      {/* TOP-CENTER: EXPLORE ARTICLES QUANTUM HUD HEADER                   */}
      {/* ================================================================= */}
      <div className="flex w-full items-center justify-center">
        <div className="inline-flex items-center gap-2.5 sm:gap-4">
          {/* Left Connector Hairline + Dot */}
          <div aria-hidden="true" className="hidden xs:flex sm:flex items-center gap-1.5">
            <span className="h-[1px] w-7 sm:w-16 md:w-24 bg-gradient-to-r from-transparent to-[#00FFFF]/70" />
            <span className="h-1 w-1 rounded-full bg-[#00FFFF]/80 shadow-[0_0_6px_#00FFFF]" />
            <span className="hidden md:inline-block h-[2px] w-[2px] rounded-full bg-[#00FFFF]/50" />
          </div>

          <div className="relative inline-flex items-center gap-2.5 px-5 py-1.5 sm:px-7 sm:py-2">
            <ChamferOutlineSvg
              chamfer={11}
              strokeColor="rgba(0, 255, 255, 0.6)"
              fillColor="rgba(5, 14, 21, 0.88)"
            />
            <Atom className="relative z-10 h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#00FFFF] drop-shadow-[0_0_8px_rgba(0,255,255,0.75)]" />
            <span className="relative z-10 font-mono-hud text-[10px] sm:text-[11px] font-medium tracking-[0.26em] text-[#E6FFFF] whitespace-nowrap">
              {ui.exploreArticles}
            </span>
          </div>

          {/* Right Connector Hairline + Dot */}
          <div aria-hidden="true" className="hidden xs:flex sm:flex items-center gap-1.5">
            <span className="hidden md:inline-block h-[2px] w-[2px] rounded-full bg-[#00FFFF]/50" />
            <span className="h-1 w-1 rounded-full bg-[#00FFFF]/80 shadow-[0_0_6px_#00FFFF]" />
            <span className="h-[1px] w-7 sm:w-16 md:w-24 bg-gradient-to-l from-transparent to-[#00FFFF]/70" />
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* MIDDLE ZONE: OPEN 3D CANVAS (LEFT/CENTER) + ARTICLE INFO (RIGHT)  */}
      {/* ================================================================= */}
      <div className="relative flex flex-1 items-end md:items-end justify-center md:justify-end md:pr-10 lg:pr-14 md:pb-5 lg:pb-7 min-h-0">
        {/* Subtle bottom scrim on mobile only so lower panel copy stays crisp over 3D floor */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-x-0 bottom-0 h-[48vh] bg-gradient-to-t from-[#05090F]/92 via-[#05090F]/65 to-transparent md:hidden -z-10"
        />

        <div
          key={activeArticle.id}
          className="pointer-events-auto w-full max-w-[400px] md:w-[340px] lg:w-[382px] pb-3 md:pb-0 space-y-2.5 sm:space-y-3 transition-opacity duration-300 motion-reduce:transition-none"
        >
          {/* Chamfered Article State Stamp + HUD Elbow Leader Line */}
          <div className="flex items-center gap-2.5">
            <div className="relative inline-flex items-center gap-2 px-3.5 py-1">
              <ChamferOutlineSvg
                chamfer={8}
                strokeColor="rgba(0, 255, 255, 0.52)"
                fillColor="rgba(5, 16, 24, 0.78)"
              />
              <span
                aria-hidden="true"
                className="relative z-10 h-2 w-2 rounded-full bg-[#00FFFF] shadow-[0_0_8px_#00FFFF]"
              />
              <span className="relative z-10 font-mono-hud text-[10px] sm:text-[10.5px] font-medium tracking-[0.2em] text-[#D8FFFF] whitespace-nowrap">
                {ui.articleLabel} {activeArticle.stateNumber}
              </span>
            </div>

            {/* Subtle Cyan Leader Line Extending Right (Desktop) */}
            <svg
              aria-hidden="true"
              viewBox="0 0 128 24"
              fill="none"
              className="hidden md:block h-5 w-28 text-[#00FFFF]/55 shrink-0"
            >
              <path
                d="M0 7 H88 L104 20 H122"
                stroke="currentColor"
                strokeWidth="1"
              />
              <circle cx="124" cy="20" r="1.8" fill="#00FFFF" />
            </svg>
          </div>

          {/* Balanced Editorial Title */}
          <h2
            style={{ textWrap: 'balance' }}
            className="font-display-hud text-xl sm:text-2xl lg:text-[28px] font-medium tracking-tight text-[#FFFFFF] leading-[1.18] drop-shadow-[0_2px_14px_rgba(0,0,0,0.92)]"
          >
            {activeArticle.title}
          </h2>

          {/* Hairline Cyan + Slate Rule */}
          <div aria-hidden="true" className="flex items-center">
            <span className="h-[1.5px] w-16 bg-[#00FFFF]/90 shadow-[0_0_8px_rgba(0,255,255,0.45)]" />
            <span className="h-[1px] flex-1 max-w-[180px] bg-gradient-to-r from-[#00FFFF]/35 to-transparent" />
          </div>

          {/* Concise Description */}
          <p className="text-xs sm:text-[13.5px] leading-relaxed text-[#C6D5E0] drop-shadow-[0_1px_10px_rgba(0,0,0,0.95)] line-clamp-3 sm:line-clamp-none">
            {activeArticle.summary}
          </p>

          {/* Inline Unboxed Icon Metadata Row (Zero Pill Containers) */}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 pt-0.5 font-mono-hud text-[10px] sm:text-[10.5px] tracking-[0.14em] text-[#B7CBD9] uppercase drop-shadow-[0_1px_8px_rgba(0,0,0,0.95)]">
            <span className="inline-flex items-center gap-1.5 text-[#D8FFFF]">
              <Atom className="h-3.5 w-3.5 text-[#00FFFF] shrink-0" />
              <span>{firstTag}</span>
            </span>
            <span aria-hidden="true" className="text-[#00FFFF]/40">|</span>
            <span className="inline-flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-[#8AE8F5] shrink-0" />
              <span>{secondTag}</span>
            </span>
            <span aria-hidden="true" className="text-[#00FFFF]/40">|</span>
            <span className="inline-flex items-center gap-1.5 text-[#A9BECB]">
              <Clock className="h-3.5 w-3.5 text-[#8AE8F5] shrink-0" />
              <span>{activeArticle.readingTime}</span>
            </span>
          </div>

          {/* Primary Chamfered READ ARTICLE CTA */}
          <div className="pt-1.5">
            <button
              type="button"
              onClick={() => onReadArticle(safeActiveIdx)}
              className="group relative inline-flex min-h-[42px] items-center gap-3 px-6 py-2 font-mono-hud text-[11px] font-medium tracking-[0.2em] text-[#D8FFFF] transition-all duration-200 hover:text-[#041018] cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#00FFFF] motion-reduce:transition-none"
            >
              <ChamferOutlineSvg
                chamfer={10}
                strokeColor="rgba(0, 255, 255, 0.85)"
                fillColor="rgba(5, 19, 28, 0.82)"
                className="transition-opacity duration-200 group-hover:opacity-0"
              />
              <ChamferOutlineSvg
                chamfer={10}
                strokeColor="#D8FFFF"
                fillColor="#00FFFF"
                className="opacity-0 transition-opacity duration-200 group-hover:opacity-100 drop-shadow-[0_0_16px_rgba(0,255,255,0.55)]"
              />
              <span className="relative z-10">{ui.readArticle}</span>
              <ArrowRight className="relative z-10 h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none" />
            </button>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* BOTTOM-CENTER: [ ◉ 01 ACTIVE | ○ 02 ] QUANTUM STATE SELECTOR      */}
      {/* ================================================================= */}
      <div className="flex w-full items-center justify-center pt-1">
        <div className="inline-flex items-center gap-2.5 sm:gap-4">
          {/* Left Hairline & Terminal Dot */}
          <div aria-hidden="true" className="hidden sm:flex items-center">
            <span className="h-1 w-1 rounded-full bg-[#00FFFF]/70" />
            <span className="h-[1px] w-10 md:w-14 bg-gradient-to-r from-[#00FFFF]/55 to-[#00FFFF]/15" />
          </div>

          <div
            role="group"
            aria-label={ui.selectAState}
            className="pointer-events-auto relative inline-flex min-h-[40px] items-center px-3 sm:px-4 py-1"
          >
            <ChamferOutlineSvg
              chamfer={11}
              strokeColor="rgba(0, 255, 255, 0.5)"
              fillColor="rgba(5, 13, 20, 0.9)"
            />

            <div className="relative z-10 flex items-center">
              {articles.map((item, idx) => {
                const isActive = idx === safeActiveIdx;
                return (
                  <React.Fragment key={item.id}>
                    {idx > 0 && (
                      <span
                        aria-hidden="true"
                        className="mx-2 sm:mx-3 h-4 w-[1px] bg-[#00FFFF]/30"
                      />
                    )}
                    <button
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => onSelectArticle(idx)}
                      className={`inline-flex min-h-[34px] items-center gap-2 px-2 sm:px-2.5 py-1 font-mono-hud text-[11px] tracking-[0.18em] transition-colors duration-200 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#00FFFF] motion-reduce:transition-none ${
                        isActive
                          ? 'text-[#FFFFFF] font-semibold'
                          : 'text-[#8EA5B5] hover:text-[#E6FFFF]'
                      }`}
                    >
                      {isActive ? (
                        <span
                          aria-hidden="true"
                          className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#00FFFF] shadow-[0_0_10px_rgba(0,255,255,0.9)]"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-[#E8FFFF]" />
                        </span>
                      ) : (
                        <span
                          aria-hidden="true"
                          className="h-3.5 w-3.5 rounded-full border border-[#8EA5B5]/75 transition-colors"
                        />
                      )}
                      <span>{item.stateNumber}</span>
                      {isActive && (
                        <span className="text-[10px] tracking-[0.16em] text-[#00FFFF]">
                          {ui.activeLabel}
                        </span>
                      )}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Right Hairline & Terminal Dot */}
          <div aria-hidden="true" className="hidden sm:flex items-center">
            <span className="h-[1px] w-10 md:w-14 bg-gradient-to-l from-[#00FFFF]/55 to-[#00FFFF]/15" />
            <span className="h-1 w-1 rounded-full bg-[#00FFFF]/70" />
          </div>
        </div>
      </div>
    </div>
  );
};
