import React from 'react';
import { ArrowRight, Atom, Clock, Cpu, Sparkles } from 'lucide-react';
import { ResumeData, ResumeResearchArticle } from '../data/resume';

interface QuantumKnowledgeHudProps {
  resume: ResumeData;
  revealAmount: number;
  enterT: number;
  activeArticleIdx: 0 | 1;
  onSelectArticle: (idx: 0 | 1) => void;
  onReadArticle: (idx: 0 | 1) => void;
}

export const QuantumKnowledgeHud: React.FC<QuantumKnowledgeHudProps> = ({
  resume,
  revealAmount,
  enterT,
  activeArticleIdx,
  onSelectArticle,
  onReadArticle,
}) => {
  const articles = resume.research;
  const activeArticle: ResumeResearchArticle | undefined =
    articles[activeArticleIdx] ?? articles[0];
  const inactiveIdx: 0 | 1 = activeArticleIdx === 0 ? 1 : 0;
  const inactiveArticle: ResumeResearchArticle | undefined = articles[inactiveIdx];

  if (!activeArticle || revealAmount <= 0.01) return null;

  const ui = resume.ui;

  return (
    <div
      aria-live="polite"
      style={{
        opacity: revealAmount,
        transform: `translate3d(0, ${((1 - enterT) * 10).toFixed(1)}px, 0)`,
      }}
      className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-between px-4 pt-12 pb-[68px] sm:px-7 sm:pt-7 sm:pb-[82px] md:px-10"
    >
      {/* Top-Center: SELECT A STATE Holographic Indicator */}
      <div className="flex items-center justify-center pt-5 sm:pt-0">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="hidden md:block h-[1px] w-16 lg:w-24 bg-gradient-to-r from-transparent via-[#00FFFF]/50 to-[#00FFFF]/75"
          />
          <div
            className="inline-flex items-center gap-2 border border-[#00FFFF]/50 bg-[#071119]/80 px-4 py-1.5 backdrop-blur-md shadow-[0_0_24px_rgba(0,255,255,0.18)]"
            style={{
              clipPath:
                'polygon(10px 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 10px 100%, 0 50%)',
            }}
          >
            <Atom className="w-3.5 h-3.5 text-[#00FFFF]" />
            <span className="font-mono-hud text-[10px] sm:text-[11px] tracking-[0.22em] text-[#E8FCFF]">
              {ui.selectAState}
            </span>
          </div>
          <span
            aria-hidden="true"
            className="hidden md:block h-[1px] w-16 lg:w-24 bg-gradient-to-l from-transparent via-[#00FFFF]/50 to-[#00FFFF]/75"
          />
        </div>
      </div>

      {/* Middle Stage Composition: Active Article Info Left, Open Interactive 3D Space Center, Secondary State Right */}
      <div className="relative my-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pr-8 md:pr-10">
        {/* Left: Active State Details Panel */}
        <div
          key={activeArticle.id}
          className="pointer-events-auto relative w-full max-w-[360px] sm:max-w-[390px] md:max-w-[340px] lg:max-w-[385px] space-y-3 rounded-lg bg-[#050A10]/65 md:bg-[#050A10]/45 p-3.5 sm:p-4 md:p-0 md:bg-transparent backdrop-blur-sm md:backdrop-blur-none transition-all duration-300 motion-reduce:transition-none"
        >
          {/* Active State Badge + Leader Line */}
          <div className="flex items-center gap-3">
            <div
              className="inline-flex items-center gap-2 border border-[#00FFFF]/65 bg-[#071620]/90 px-3.5 py-1 shadow-[0_0_18px_rgba(0,255,255,0.22)]"
              style={{
                clipPath:
                  'polygon(8px 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 8px 100%, 0 50%)',
              }}
            >
              <span className="h-2 w-2 rounded-full bg-[#00FFFF] shadow-[0_0_8px_#00FFFF]" />
              <span className="font-mono-hud text-[10px] sm:text-[11px] font-semibold tracking-[0.18em] text-[#D8FFFF]">
                {ui.stateLabel} {activeArticle.stateNumber}
              </span>
            </div>

            <span
              aria-hidden="true"
              className="hidden lg:block h-[1px] flex-1 bg-gradient-to-r from-[#00FFFF]/70 to-transparent"
            />
          </div>

          {/* Article Title */}
          <h2 className="font-display-hud text-xl sm:text-2xl lg:text-[27px] font-medium tracking-tight text-[#FFFFFF] leading-[1.18] drop-shadow-[0_2px_14px_rgba(0,0,0,0.95)]">
            {activeArticle.title}
          </h2>

          <div aria-hidden="true" className="h-[1px] w-48 bg-gradient-to-r from-[#00FFFF]/55 to-transparent" />

          {/* Short Description */}
          <p className="text-xs sm:text-[13.5px] leading-relaxed text-[#D0DCE5] drop-shadow-[0_1px_8px_rgba(0,0,0,0.95)]">
            {activeArticle.summary}
          </p>

          {/* Tags & Reading Time Strip */}
          <div className="flex flex-wrap items-center gap-2.5 pt-0.5 font-mono-hud text-[10px] tracking-wider text-[#B6C8D6]">
            {activeArticle.tags.slice(0, 2).map((tag, i) => (
              <React.Fragment key={tag}>
                <span className="inline-flex items-center gap-1.5 text-[#D8FFFF]">
                  {i === 0 ? (
                    <Sparkles className="w-3 h-3 text-[#00FFFF]" />
                  ) : (
                    <Cpu className="w-3 h-3 text-[#00FFFF]" />
                  )}
                  <span>{tag}</span>
                </span>
                <span aria-hidden="true" className="text-[#8A929A]/50">|</span>
              </React.Fragment>
            ))}
            <span className="inline-flex items-center gap-1.5 text-[#E2F6FA]">
              <Clock className="w-3 h-3 text-[#00FFFF]" />
              <span>{activeArticle.readingTime}</span>
            </span>
          </div>

          {/* READ ARTICLE Action */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => onReadArticle(activeArticleIdx)}
              className="group relative inline-flex items-center gap-3 border border-[#00FFFF]/70 bg-[#071620]/85 px-5 py-2.5 font-mono-hud text-[11px] font-medium tracking-[0.2em] text-[#E6FFFF] backdrop-blur-md shadow-[0_0_24px_rgba(0,255,255,0.2)] transition-all duration-200 hover:border-[#FFFFFF] hover:bg-[#00FFFF] hover:text-[#050C14] hover:shadow-[0_0_28px_rgba(0,255,255,0.55)] cursor-pointer focus-visible:outline-2 focus-visible:outline-[#00FFFF] motion-reduce:transition-none"
              style={{
                clipPath:
                  'polygon(10px 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 10px 100%, 0 50%)',
              }}
            >
              <span>{ui.readArticle}</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none" />
            </button>
          </div>
        </div>

        {/* Right: Secondary Inactive State Interactive Callout */}
        {inactiveArticle && (
          <button
            type="button"
            onClick={() => onSelectArticle(inactiveIdx)}
            aria-label={`${ui.stateLabel} ${inactiveArticle.stateNumber}: ${inactiveArticle.title}`}
            className="pointer-events-auto group hidden md:flex flex-col items-end text-right max-w-[210px] lg:max-w-[235px] space-y-1.5 opacity-80 hover:opacity-100 transition-opacity duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#00FFFF] motion-reduce:transition-none"
          >
            <div className="flex items-center gap-2.5 w-full justify-end">
              <span
                aria-hidden="true"
                className="h-[1px] w-10 bg-gradient-to-l from-[#00FFFF]/55 to-transparent group-hover:from-[#00FFFF]"
              />
              <span
                className="inline-flex items-center gap-1.5 border border-[#00FFFF]/40 bg-[#071119]/85 px-3 py-0.5 font-mono-hud text-[10px] tracking-[0.16em] text-[#9BE8F4] group-hover:border-[#00FFFF] group-hover:text-[#FFFFFF] transition-colors"
                style={{
                  clipPath:
                    'polygon(7px 0, calc(100% - 7px) 0, 100% 50%, calc(100% - 7px) 100%, 7px 100%, 0 50%)',
                }}
              >
                {ui.stateLabel} {inactiveArticle.stateNumber}
              </span>
            </div>
            <p className="font-display-hud text-sm lg:text-base font-normal text-[#DCE8F0] group-hover:text-[#FFFFFF] leading-snug drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
              {inactiveArticle.title}
            </p>
            <span aria-hidden="true" className="h-[1px] w-12 bg-[#00FFFF]/45 group-hover:w-20 transition-all" />
          </button>
        )}
      </div>

      {/* Bottom State Selector: [ 01 ACTIVE | 02 ] */}
      <div className="flex items-center justify-center pb-1">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="hidden sm:block h-[1px] w-12 md:w-20 bg-gradient-to-r from-transparent to-[#00FFFF]/60"
          />

          <div
            role="group"
            aria-label={ui.selectAState}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                onSelectArticle(1);
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                onSelectArticle(0);
              }
            }}
            className="pointer-events-auto inline-flex items-center border border-[#00FFFF]/55 bg-[#071119]/90 px-3 py-1.5 backdrop-blur-md shadow-[0_8px_28px_rgba(0,0,0,0.72),0_0_20px_rgba(0,255,255,0.16)]"
            style={{
              clipPath:
                'polygon(12px 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 0 50%)',
            }}
          >
            {([0, 1] as const).map((idx, mapIdx) => {
              const item = articles[idx];
              if (!item) return null;
              const isSelected = activeArticleIdx === idx;
              return (
                <React.Fragment key={item.id}>
                  {mapIdx > 0 && (
                    <span aria-hidden="true" className="mx-3 h-3.5 w-[1px] bg-[#00FFFF]/35" />
                  )}
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onSelectArticle(idx)}
                    className={`inline-flex items-center gap-2 px-2 py-0.5 font-mono-hud text-[10px] sm:text-[11px] tracking-[0.18em] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#00FFFF] motion-reduce:transition-none ${
                      isSelected
                        ? 'text-[#00FFFF] font-semibold'
                        : 'text-[#90A4B4] hover:text-[#FFFFFF]'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${
                        isSelected
                          ? 'border-[#00FFFF] bg-[#00FFFF]/20 shadow-[0_0_10px_#00FFFF]'
                          : 'border-[#8A929A]/60'
                      }`}
                    >
                      {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-[#00FFFF]" />}
                    </span>
                    <span>
                      {item.stateNumber}
                      {isSelected ? ` ${ui.activeLabel}` : ''}
                    </span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          <span
            aria-hidden="true"
            className="hidden sm:block h-[1px] w-12 md:w-20 bg-gradient-to-l from-transparent to-[#00FFFF]/60"
          />
        </div>
      </div>
    </div>
  );
};
