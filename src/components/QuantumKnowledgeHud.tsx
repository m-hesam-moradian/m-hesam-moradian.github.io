import React, { useEffect, useState } from 'react';
import { ArrowRight, Layers } from 'lucide-react';
import { ResumeData, ResumeResearchArticle } from '../data/resume';

interface QuantumKnowledgeHudProps {
  resume: ResumeData;
  revealAmount: number;
  enterT: number;
  activeArticleIdx: number;
  onSelectArticle: (idx: number) => void;
  onReadArticle: (idx: number) => void;
}

interface ArticleArtworkProps {
  article: ResumeResearchArticle;
  isSelected: boolean;
}

const ArticleArtworkMedia: React.FC<ArticleArtworkProps> = ({ article, isSelected }) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [article.imageUrl]);

  if (failed || !article.imageUrl) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-[radial-gradient(circle_at_50%_40%,rgba(0,255,255,0.16),rgba(6,12,18,0.96)_72%)] flex flex-col items-center justify-center p-6 text-center">
        <Layers className="w-8 h-8 text-[#00FFFF]/80 mb-3" />
        <p className="font-mono-hud text-[11px] tracking-[0.22em] text-[#00FFFF]">
          {article.stateNumber}
        </p>
        <p className="mt-1 font-display-hud text-sm text-[#DCE8F0] line-clamp-2">
          {article.title}
        </p>
      </div>
    );
  }

  return (
    <img
      src={article.imageUrl}
      alt={article.imageAlt || article.title}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`h-full w-full object-cover select-none transition-transform duration-[720ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
        isSelected ? 'scale-100' : 'scale-[1.03]'
      }`}
      draggable={false}
    />
  );
};

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
  const [hoveredBgIdx, setHoveredBgIdx] = useState<number | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  if (!activeArticle || revealAmount <= 0.01) return null;

  const ui = resume.ui;

  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setTilt({ x: nx, y: ny });
  };

  const handleStagePointerLeave = () => {
    setTilt({ x: 0, y: 0 });
    setHoveredBgIdx(null);
  };

  return (
    <div
      aria-live="polite"
      style={{
        opacity: revealAmount,
        transform: `translate3d(0, ${((1 - enterT) * 10).toFixed(1)}px, 0)`,
      }}
      className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center px-4 pt-[62px] pb-[68px] sm:px-8 sm:pt-[72px] sm:pb-[82px] md:pr-14"
    >
      <div className="mx-auto grid w-full max-w-[1140px] grid-cols-1 md:grid-cols-[minmax(290px,390px)_1fr] items-center gap-5 sm:gap-7 md:gap-8 lg:gap-12">
        {/* ================================================================= */}
        {/* LAYERED QUANTUM SUPERPOSITION ARTWORKS (Mobile top / Desktop right) */}
        {/* ================================================================= */}
        <div
          onPointerMove={handleStagePointerMove}
          onPointerLeave={handleStagePointerLeave}
          className="order-1 md:order-2 relative flex w-full items-center justify-center md:justify-end"
          style={{ perspective: '1200px' }}
        >
          {/* Ambient radial quantum light halo anchored gently behind active state */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-[8%] top-1/2 -translate-y-1/2 h-[72%] w-[72%] rounded-full bg-[radial-gradient(circle,rgba(0,255,255,0.16)_0%,rgba(0,255,255,0.04)_48%,transparent_76%)] blur-2xl"
          />

          {/* Stage box reserves clean upper-right depth offset so background state peeks unobscured */}
          <div className="relative w-full max-w-[310px] sm:max-w-[380px] md:max-w-[490px] lg:max-w-[540px] pt-5 pr-9 sm:pt-7 sm:pr-14 md:pt-10 md:pr-16">
            <div className="relative aspect-[4/3] w-full">
              {articles.map((article, idx) => {
                const isSelected = idx === safeActiveIdx;
                // Deterministic cyclic depth order supports 2 articles today and seamlessly scales to 3+
                const depthOrder = isSelected ? 0 : (idx - safeActiveIdx + count) % count;
                const isHoveredBg = !isSelected && hoveredBgIdx === idx;

                // Subtle mouse parallax adds physical depth separation between observed & unobserved layers
                const parallaxX = isSelected ? tilt.x * 5 : tilt.x * -7;
                const parallaxY = isSelected ? tilt.y * 4 : tilt.y * -5;

                const offsetXPct = depthOrder * 17;
                const offsetYPct = depthOrder * -13;
                const baseScale = isSelected ? 1 : Math.max(0.74, 0.85 - (depthOrder - 1) * 0.08);
                const hoverScaleBoost = isHoveredBg ? 0.025 : 0;

                const transformStr = isSelected
                  ? `translate3d(${parallaxX.toFixed(1)}px, ${parallaxY.toFixed(1)}px, 0px) scale(1)`
                  : `translate3d(calc(${offsetXPct}% + ${parallaxX.toFixed(1)}px), calc(${offsetYPct}% + ${parallaxY.toFixed(1)}px), 0px) scale(${(
                      baseScale + hoverScaleBoost
                    ).toFixed(3)})`;

                const filterStr = isSelected
                  ? 'blur(0px) brightness(1.04) contrast(1.03) saturate(1.06)'
                  : isHoveredBg
                    ? 'blur(1px) brightness(0.76) saturate(0.9)'
                    : 'blur(2.6px) brightness(0.54) saturate(0.72)';

                const opacityVal = isSelected ? 1 : isHoveredBg ? 0.76 : 0.46;

                return (
                  <button
                    key={article.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        onReadArticle(idx);
                      } else {
                        setHoveredBgIdx(null);
                        onSelectArticle(idx);
                      }
                    }}
                    onMouseEnter={() => {
                      if (!isSelected) setHoveredBgIdx(idx);
                    }}
                    onMouseLeave={() => {
                      if (!isSelected) setHoveredBgIdx((prev) => (prev === idx ? null : prev));
                    }}
                    aria-label={
                      isSelected
                        ? `${ui.readArticle}: ${article.title}`
                        : `${ui.stateLabel} ${article.stateNumber} (${ui.unobservedLabel}): ${article.title}`
                    }
                    style={{
                      zIndex: isSelected ? 20 : 10 - depthOrder,
                      opacity: opacityVal,
                      transform: transformStr,
                      filter: filterStr,
                    }}
                    className={`pointer-events-auto group absolute inset-0 overflow-hidden text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-[#00FFFF] transition-[transform,opacity,filter,box-shadow,border-color] duration-[720ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                      isSelected
                        ? 'border border-[#00FFFF]/65 bg-[#05090E] shadow-[0_28px_72px_rgba(0,0,0,0.92),0_0_46px_rgba(0,255,255,0.2)]'
                        : 'border border-[#00FFFF]/30 hover:border-[#00FFFF]/60 bg-[#05090E] shadow-[0_18px_48px_rgba(0,0,0,0.85)]'
                    }`}
                  >
                    <ArticleArtworkMedia article={article} isSelected={isSelected} />

                    {/* Subtle radial vignette around outer edges only — preserves full central artwork clarity */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_58%,rgba(3,7,12,0.52)_100%)]"
                    />

                    {/* Precision Holographic Corner Reticles on Foreground Observed Artwork */}
                    {isSelected && (
                      <>
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute top-0 left-0 h-4 w-4 border-t-2 border-l-2 border-[#00FFFF]"
                        />
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute top-0 right-0 h-4 w-4 border-t-2 border-r-2 border-[#00FFFF]/65"
                        />
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-[#00FFFF]/65"
                        />
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-[#00FFFF]"
                        />
                      </>
                    )}

                    {/* Quiet Top-Right State Index Marker on Exposed Corner of Unselected Background State */}
                    {!isSelected && (
                      <div className="pointer-events-none absolute top-2.5 right-3 flex items-center gap-2 font-mono-hud text-[10px] tracking-[0.18em] text-[#B8F4FC]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#00FFFF]/70" />
                        <span>{article.stateNumber}</span>
                        <span className="hidden sm:inline text-[#8CA6B8] group-hover:text-[#D8FFFF] transition-colors">
                          · {ui.unobservedLabel}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* INTEGRATED ARTICLE INFO & OBSERVATION SWITCHER (Zero Artwork Overlap) */}
        {/* ================================================================= */}
        <div
          key={activeArticle.id}
          className="pointer-events-auto order-2 md:order-1 w-full max-w-[420px] mx-auto md:mx-0 space-y-3 sm:space-y-3.5 transition-opacity duration-300 motion-reduce:transition-none"
        >
          {/* Quiet Typographic Metadata Line (Zero Pill Enclosures) */}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono-hud text-[10.5px] sm:text-[11px] tracking-[0.16em] text-[#00FFFF]">
            <span className="font-semibold text-[#D8FFFF]">
              {ui.stateLabel} {activeArticle.stateNumber}
            </span>
            <span aria-hidden="true" className="text-[#8A929A]/50">·</span>
            <span className="text-[#00FFFF]">{ui.observedLabel}</span>
            <span aria-hidden="true" className="text-[#8A929A]/50">·</span>
            <span className="text-[#9BB2C2]">{activeArticle.readingTime}</span>
          </div>

          {/* Balanced Display Title */}
          <h2
            style={{ textWrap: 'balance' }}
            className="font-display-hud text-lg sm:text-2xl lg:text-[27px] font-medium tracking-tight text-[#FFFFFF] leading-[1.2] drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]"
          >
            {activeArticle.title}
          </h2>

          <div
            aria-hidden="true"
            className="h-[1px] w-36 bg-gradient-to-r from-[#00FFFF]/70 via-[#00FFFF]/25 to-transparent"
          />

          {/* Concise Article Description */}
          <p className="text-xs sm:text-[14px] leading-relaxed text-[#C9D6E0] line-clamp-3 sm:line-clamp-none">
            {activeArticle.summary}
          </p>

          {/* Unboxed Venue & Topic Tags */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono-hud text-[10px] tracking-[0.14em] text-[#8CA2B2]">
            <span>{activeArticle.venue}</span>
            <span aria-hidden="true">·</span>
            <span>{activeArticle.year}</span>
            {activeArticle.tags.slice(0, 2).map((tag) => (
              <React.Fragment key={tag}>
                <span aria-hidden="true">·</span>
                <span className="text-[#B8D8E6]">{tag}</span>
              </React.Fragment>
            ))}
          </div>

          {/* Primary Read Action + Quantum State Segmented Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1.5">
            <button
              type="button"
              onClick={() => onReadArticle(safeActiveIdx)}
              className="group inline-flex min-h-[40px] items-center gap-2.5 border border-[#00FFFF]/75 bg-[#071620]/90 px-5 py-2 font-mono-hud text-[11px] font-medium tracking-[0.18em] text-[#E8FFFF] shadow-[0_0_24px_rgba(0,255,255,0.2)] transition-all duration-200 hover:border-[#FFFFFF] hover:bg-[#00FFFF] hover:text-[#050C14] hover:shadow-[0_0_28px_rgba(0,255,255,0.5)] cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#00FFFF] motion-reduce:transition-none"
            >
              <span>{ui.readArticle}</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none" />
            </button>

            <div
              role="group"
              aria-label={ui.selectAState}
              onKeyDown={(e) => {
                if (count < 2) return;
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  onSelectArticle((safeActiveIdx + 1) % count);
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  onSelectArticle((safeActiveIdx - 1 + count) % count);
                }
              }}
              className="inline-flex min-h-[40px] items-center border border-[#00FFFF]/35 bg-[#071018]/85 p-1 font-mono-hud text-[10.5px] tracking-[0.16em]"
            >
              {articles.map((item, idx) => {
                const isActive = idx === safeActiveIdx;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => onSelectArticle(idx)}
                    className={`min-h-[32px] px-3 py-1 transition-colors duration-200 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#00FFFF] motion-reduce:transition-none ${
                      isActive
                        ? 'bg-[#00FFFF] text-[#050C14] font-semibold'
                        : 'text-[#8FA4B5] hover:text-[#FFFFFF]'
                    }`}
                  >
                    {item.stateNumber}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
