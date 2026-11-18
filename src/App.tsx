/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Box,
  Briefcase,
  Download,
  GripHorizontal,
  Network,
  Radio,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { HologramInspectorModal, ScrollCardKind } from './components/HologramInspectorModal';
import { DeFlagIcon, LanguageSwitch, UkFlagIcon } from './components/LanguageSwitch';
import { DETAILED_CHAMBERS } from './data/portfolioSections';
import { getLocalizedResume, LocaleCode } from './data/resume';
import { PedestalMode } from './three/detailedChambers';
import { ObsidianCyanScene } from './three/ObsidianCyanScene';
import { ambientAudio } from './utils/ambientAudio';
import { ScrambleText } from './utils/scrambleText';

const CHAMBER_ICONS = [Box, Network, Briefcase, BookOpen, Radio] as const;

const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

interface ScrollCardState {
  activeCard: ScrollCardKind | null;
  revealAmount: number;
  enterT: number;
  exitT: number;
}

function getScrollCardState(progress: number): ScrollCardState {
  // CH.02 // ABOUT ME (0.155 -> 0.245)
  if (progress >= 0.155 && progress <= 0.245) {
    const enterT = smoothstep(0.155, 0.178, progress);
    const exitT = smoothstep(0.222, 0.245, progress);
    return {
      activeCard: 'about',
      revealAmount: enterT * (1 - exitT),
      enterT,
      exitT,
    };
  }

  // CH.03 // EXPERIENCE ONLY (0.422 -> 0.530)
  if (progress >= 0.422 && progress <= 0.53) {
    const enterT = smoothstep(0.422, 0.448, progress);
    const exitT = smoothstep(0.502, 0.53, progress);
    return {
      activeCard: 'experience',
      revealAmount: enterT * (1 - exitT),
      enterT,
      exitT,
    };
  }

  // CH.04 // ARTICLES & RESEARCH (0.672 -> 0.775)
  if (progress >= 0.672 && progress <= 0.775) {
    const enterT = smoothstep(0.672, 0.698, progress);
    const exitT = smoothstep(0.748, 0.775, progress);
    return {
      activeCard: 'research',
      revealAmount: enterT * (1 - exitT),
      enterT,
      exitT,
    };
  }

  // CH.05 // CONTACT (0.872 -> 0.942)
  if (progress >= 0.872 && progress <= 0.942) {
    const enterT = smoothstep(0.872, 0.895, progress);
    const exitT = smoothstep(0.922, 0.942, progress);
    return {
      activeCard: 'contact',
      revealAmount: enterT * (1 - exitT),
      enterT,
      exitT,
    };
  }

  return { activeCard: null, revealAmount: 0, enterT: 0, exitT: 0 };
}

export default function App() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeChamberIdx, setActiveChamberIdx] = useState(0);
  const [warpIntensity, setWarpIntensity] = useState(0);
  const [teleportFlash, setTeleportFlash] = useState(0);
  const [isOrbiting, setIsOrbiting] = useState(false);
  const [pedestalMode, setPedestalMode] = useState<PedestalMode>('email');
  const [cameraResetNonce, setCameraResetNonce] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hudHidden, setHudHidden] = useState(false);
  const [locale, setLocale] = useState<LocaleCode>(() => {
    try {
      const saved = window.localStorage.getItem('portfolio_lang');
      return saved === 'de' ? 'de' : 'en';
    } catch {
      return 'en';
    }
  });
  const lastLoopWrapRef = useRef(0);
  const jumpAnimRef = useRef<number | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [cvModalOpen, setCvModalOpen] = useState(false);

  useEffect(() => {
    document.documentElement.lang = locale;
    try {
      window.localStorage.setItem('portfolio_lang', locale);
    } catch {
      // Ignore storage access restrictions
    }
  }, [locale]);

  const handleChangeLocale = useCallback((nextLocale: LocaleCode) => {
    setLocale((prev) => {
      if (prev !== nextLocale) ambientAudio.playPulse();
      return nextLocale;
    });
  }, []);

  const cancelJumpAnimation = useCallback(() => {
    if (jumpAnimRef.current !== null) {
      cancelAnimationFrame(jumpAnimRef.current);
      jumpAnimRef.current = null;
    }
  }, []);

  useEffect(() => {
    let raf = 0;
    const syncScroll = () => {
      raf = 0;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, window.scrollY / maxScroll));

      // Seamless infinite loop: once sky descent lands right at Stage 1 (>= 0.995), wrap back to top
      if (progress >= 0.995 && Date.now() - lastLoopWrapRef.current > 700) {
        lastLoopWrapRef.current = Date.now();
        cancelJumpAnimation();
        window.scrollTo({ top: 1, behavior: 'auto' });
        setScrollProgress(1 / maxScroll);
        return;
      }

      setScrollProgress(progress);
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(syncScroll);
    };

    const onUserInterrupt = () => {
      cancelJumpAnimation();
    };

    syncScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', syncScroll, { passive: true });
    window.addEventListener('wheel', onUserInterrupt, { passive: true });
    window.addEventListener('touchstart', onUserInterrupt, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', syncScroll);
      window.removeEventListener('wheel', onUserInterrupt);
      window.removeEventListener('touchstart', onUserInterrupt);
      if (raf) cancelAnimationFrame(raf);
      cancelJumpAnimation();
    };
  }, [cancelJumpAnimation]);

  useEffect(() => {
    ambientAudio.start(false);
    const unlockAudio = () => {
      ambientAudio.resumeFromGesture();
    };
    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });
    window.addEventListener('wheel', unlockAudio, { passive: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCvModalOpen(false);
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        setHudHidden((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('wheel', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', onKeyDown);
      ambientAudio.dispose();
    };
  }, []);

  const handleTelemetryUpdate = useCallback(
    (chamberIdx: number, warp: number, teleport: number, orbiting: boolean) => {
      setActiveChamberIdx((prev) => {
        if (prev !== chamberIdx) ambientAudio.playPulse();
        return chamberIdx;
      });
      setWarpIntensity(warp);
      setTeleportFlash(teleport);
      setIsOrbiting(orbiting);
    },
    []
  );

  // Smooth cubic-eased scroll glide when clicking capsule chapter buttons (01..05)
  const handleJumpChamber = useCallback(
    (idx: number) => {
      const ch = DETAILED_CHAMBERS[idx];
      if (!ch) return;
      ambientAudio.playPulse();
      cancelJumpAnimation();

      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const startY = window.scrollY;
      const targetY = ch.scrollAt * maxScroll;
      const distance = Math.abs(targetY - startY);
      const fraction = distance / maxScroll;
      const durationMs = Math.max(1600, Math.min(3500, 1450 + fraction * 2250));
      const startTime = performance.now();

      const step = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / durationMs);
        const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        window.scrollTo({ top: startY + (targetY - startY) * eased, behavior: 'auto' });
        if (t < 1) {
          jumpAnimRef.current = requestAnimationFrame(step);
        } else {
          jumpAnimRef.current = null;
        }
      };

      setCameraResetNonce((n) => n + 1);
      jumpAnimRef.current = requestAnimationFrame(step);
    },
    [cancelJumpAnimation]
  );

  const scrubToClientY = useCallback(
    (clientY: number) => {
      const rail = railRef.current;
      if (!rail) return;
      const rect = rail.getBoundingClientRect();
      if (rect.height <= 0) return;
      cancelJumpAnimation();
      const ratio = Math.min(0.992, Math.max(0, (clientY - rect.top) / rect.height));
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      window.scrollTo({ top: ratio * maxScroll, behavior: 'auto' });
      setScrollProgress(ratio);
    },
    [cancelJumpAnimation]
  );

  const handleToggleSound = useCallback(() => {
    const next = ambientAudio.toggle();
    setSoundEnabled(next);
  }, []);

  const resume = useMemo(() => getLocalizedResume(locale), [locale]);
  const activeChamber = resume.chambers[activeChamberIdx] ?? resume.chambers[0];
  const cardState = getScrollCardState(scrollProgress);
  const genesisCvOpacity = scrollProgress < 0.042 ? 1 - smoothstep(0.014, 0.042, scrollProgress) : 0;

  return (
    <div className="relative bg-[#121417] text-[#FFFFFF]">
      {/* Full-Viewport Obsidian & Pure Cyan 3D Engine */}
      <ObsidianCyanScene
        scrollProgress={scrollProgress}
        pedestalMode={pedestalMode}
        cameraResetNonce={cameraResetNonce}
        onTelemetryUpdate={handleTelemetryUpdate}
      />

      {/* Subtle Pure Cyan Portal Warp Flash */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-10 bg-[#00FFFF]"
        style={{ opacity: warpIntensity * 0.05, transition: 'opacity 60ms linear' }}
      />

      {/* Portal Core Teleport Flash (pure-cyan energy saturation across Neuron, Reactor, Codex portals) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-40"
        style={{
          opacity: teleportFlash,
          background:
            'radial-gradient(circle at center, #D8FFFF 0%, #00FFFF 42%, #091820 100%)',
        }}
      />

      {/* Minimal Edge HUD Overlay */}
      {!hudHidden && (
        <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-3.5 sm:p-5 md:p-7">
          {/* Top Row: Clean Chapter Stamp Left, Crisp Identity & Flag Language Toggle Right */}
          <div className="flex items-start justify-between gap-3 sm:gap-6 pr-6 sm:pr-10 md:pr-12">
            <div className="space-y-0.5 min-w-0">
              <p className="font-mono-hud text-xs font-medium tracking-widest text-[#FFFFFF]">
                <ScrambleText text={activeChamber.hudTitle} />
              </p>
              <p className="font-mono-hud text-[10px] tracking-wider text-[#00FFFF]">
                <ScrambleText text={activeChamber.sectionTag} durationMs={320} />
              </p>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-4 text-right shrink-0">
              <div className="hidden sm:block space-y-0.5">
                <p className="font-mono-hud text-[11px] tracking-widest text-[#00FFFF]">
                  {resume.identity.name.toUpperCase()}
                </p>
                <p className="font-mono-hud text-[10px] text-[#8A929A]">
                  {resume.identity.role}
                </p>
              </div>
              {isOrbiting && (
                <button
                  type="button"
                  onClick={() => setCameraResetNonce((n) => n + 1)}
                  className="pointer-events-auto font-mono-hud text-[10px] tracking-wider border border-[#8A929A]/50 bg-[#121417]/80 px-2 sm:px-2.5 py-1 text-[#FFFFFF] hover:border-[#00FFFF] hover:text-[#00FFFF] transition-colors cursor-pointer"
                >
                  {resume.ui.resetView}
                </button>
              )}
              <LanguageSwitch locale={locale} onChange={handleChangeLocale} />
            </div>
          </div>

          {/* Elegant Cosmic Horizon Scroll Prompt at Top-Center Sky */}
          {scrollProgress < 0.032 && (
            <div
              aria-hidden="true"
              style={{ opacity: genesisCvOpacity }}
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-[62px] sm:top-7 flex items-center gap-2.5 sm:gap-3"
            >
              <span className="hidden sm:block h-[1px] w-10 bg-gradient-to-r from-transparent to-[#00FFFF]/55" />
              <div className="inline-flex items-center gap-2.5 rounded-full border border-[#00FFFF]/25 bg-[#070D14]/65 px-3.5 py-1.5 backdrop-blur-md shadow-[0_6px_24px_rgba(0,0,0,0.55),0_0_20px_rgba(0,255,255,0.12)]">
                <span className="relative flex h-4 w-2.5 items-center justify-center rounded-full border border-[#00FFFF]/75">
                  <span className="scroll-bead-drop h-1.5 w-[2px] rounded-full bg-[#00FFFF] shadow-[0_0_6px_#00FFFF]" />
                </span>
                <span className="font-mono-hud text-[9px] sm:text-[10px] font-medium tracking-[0.26em] text-[#E6FFFF] whitespace-nowrap drop-shadow-[0_0_10px_rgba(0,255,255,0.4)]">
                  {resume.ui.scrollToExplore}
                </span>
              </div>
              <span className="hidden sm:block h-[1px] w-10 bg-gradient-to-l from-transparent to-[#00FFFF]/55" />
            </div>
          )}

          {/* Compact Rounded Download CV Pill with Animated Laser Border */}
          {genesisCvOpacity > 0.02 && (
            <div
              style={{ opacity: genesisCvOpacity }}
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-[76px] sm:bottom-[86px] flex items-center justify-center px-3"
            >
              <button
                type="button"
                onClick={() => {
                  ambientAudio.playPulse();
                  setCvModalOpen(true);
                }}
                className="group pointer-events-auto relative inline-flex items-center justify-center rounded-full p-[1.5px] overflow-hidden bg-[#00FFFF]/25 shadow-[0_8px_24px_rgba(0,0,0,0.78),0_0_20px_rgba(0,255,255,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(0,0,0,0.88),0_0_32px_rgba(0,255,255,0.44)] cursor-pointer focus-visible:outline-2 focus-visible:outline-[#00FFFF]"
              >
                {/* Rotating Conic Cyan Laser Border */}
                <span
                  aria-hidden="true"
                  className="cv-border-spin pointer-events-none absolute left-1/2 top-1/2 h-[240px] w-[240px] rounded-full"
                  style={{
                    background:
                      'conic-gradient(from 0deg, transparent 0deg, transparent 215deg, rgba(0,255,255,0.45) 265deg, #00FFFF 305deg, #D8FFFF 335deg, rgba(0,255,255,0.35) 352deg, transparent 360deg)',
                  }}
                />

                {/* Compact Inner Obsidian-Cyan Pill */}
                <span className="relative z-10 inline-flex items-center gap-2 overflow-hidden rounded-full bg-[#081018]/94 px-3 py-1 sm:px-3.5 sm:py-1.5 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  {/* Subtle Internal Light Sweep */}
                  <span
                    aria-hidden="true"
                    className="cv-shimmer-bar pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-transparent via-[#00FFFF]/18 to-transparent"
                  />

                  <span className="relative z-10 flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-[#00FFFF] text-[#050C16] shadow-[0_0_12px_rgba(0,255,255,0.6)] transition-transform duration-300 group-hover:scale-110">
                    <Download className="w-3 h-3 stroke-[2.4]" />
                  </span>

                  <span className="relative z-10 font-display-hud text-[11px] sm:text-xs font-medium tracking-wide text-[#FFFFFF] whitespace-nowrap group-hover:text-[#D8FFFF] transition-colors">
                    {resume.ui.downloadCv}
                  </span>

                  <span className="relative z-10 rounded-full border border-[#00FFFF]/40 bg-[#00FFFF]/10 px-1.5 py-0.5 font-mono-hud text-[8px] tracking-widest text-[#00FFFF]">
                    EN / DE
                  </span>
                </span>
              </button>
            </div>
          )}

          {/* Bottom Row: Quiet Sound Toggle Left + Cohesive Obsidian-Cyan Pill Dock Center + Progress Readout Right */}
          <div className="relative flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleToggleSound}
              className="pointer-events-auto inline-flex min-h-[36px] items-center gap-1.5 font-mono-hud text-[10px] tracking-wider text-[#8A929A] hover:text-[#00FFFF] transition-colors cursor-pointer"
              aria-label="Toggle ambient sound"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-[#00FFFF]" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {soundEnabled ? resume.ui.audioOn : resume.ui.audioOff}
              </span>
            </button>

            {/* Centered Obsidian-Cyan Glass Pill Capsule Dock (01..05 Icon Switcher) */}
            <nav
              aria-label="Chapter Navigation"
              className="pointer-events-auto absolute left-1/2 -translate-x-1/2 bottom-0 inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-[#00FFFF]/35 bg-[#081018]/92 px-2 py-1.5 backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.84),0_0_24px_rgba(0,255,255,0.14),inset_0_1px_0_rgba(255,255,255,0.08)]"
            >
              {DETAILED_CHAMBERS.map((ch, idx) => {
                const isActive = idx === activeChamberIdx;
                const Icon = CHAMBER_ICONS[idx] ?? Box;
                const localizedCh = resume.chambers[idx] ?? ch;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => handleJumpChamber(idx)}
                    aria-label={`${localizedCh.hudTitle} (${localizedCh.sectionTag})`}
                    title={localizedCh.hudTitle}
                    className={`relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full transition-all duration-300 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#00FFFF] ${
                      isActive
                        ? 'bg-[#00FFFF] text-[#050C16] shadow-[0_0_20px_rgba(0,255,255,0.68),inset_0_1px_2px_rgba(255,255,255,0.65)] ring-2 ring-[#D8FFFF]/60 scale-105'
                        : 'border border-transparent text-[#8FA2B2] hover:border-[#00FFFF]/40 hover:bg-[#00FFFF]/10 hover:text-[#FFFFFF]'
                    }`}
                  >
                    <Icon className="w-4 h-4 sm:w-[18px] sm:h-[18px]" strokeWidth={isActive ? 2.35 : 1.75} />
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#D8FFFF] shadow-[0_0_6px_#00FFFF]"
                      />
                    )}
                  </button>
                );
              })}
            </nav>

            <span className="font-mono-hud text-[10px] text-[#00FFFF] w-9 text-right">
              {String(Math.round(scrollProgress * 100)).padStart(3, '0')}%
            </span>
          </div>
        </div>
      )}

      {/* Full-Height Right-Edge Vertical Progress Scrubber (starts cleanly below Top HUD row) */}
      {!hudHidden && (
        <div className="fixed right-2 sm:right-4 top-[78px] sm:top-[88px] bottom-16 z-30 flex items-center select-none">
          <div
            ref={railRef}
            role="slider"
            tabIndex={0}
            aria-label="Scroll progress scrubber"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(scrollProgress * 100)}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setIsScrubbing(true);
              scrubToClientY(e.clientY);
            }}
            onPointerMove={(e) => {
              if (!isScrubbing) return;
              scrubToClientY(e.clientY);
            }}
            onPointerUp={(e) => {
              if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                e.currentTarget.releasePointerCapture(e.pointerId);
              }
              setIsScrubbing(false);
            }}
            onPointerCancel={() => setIsScrubbing(false)}
            onKeyDown={(e) => {
              const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
              if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                e.preventDefault();
                window.scrollBy({ top: maxScroll * 0.05, behavior: 'auto' });
              } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                e.preventDefault();
                window.scrollBy({ top: -maxScroll * 0.05, behavior: 'auto' });
              }
            }}
            className="pointer-events-auto touch-none relative h-full w-8 flex justify-center cursor-ns-resize focus-visible:outline-2 focus-visible:outline-[#00FFFF]"
          >
            {/* Full-Height Track */}
            <div className="relative h-full w-[3px] rounded-full bg-[#8A929A]/25 overflow-hidden">
              <div
                className="w-full rounded-full bg-[#00FFFF] shadow-[0_0_10px_#00FFFF]"
                style={{ height: `${(scrollProgress * 100).toFixed(2)}%` }}
              />
            </div>

            {/* Subtle Chapter Tick Dots along Rail (01..05) */}
            {DETAILED_CHAMBERS.map((ch) => (
              <span
                key={ch.id}
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-[#00FFFF]/55"
                style={{ top: `${ch.scrollAt * 100}%` }}
              />
            ))}

            {/* Visible Interactive Thumb Button for Touch / Pointer Drag Scrolling */}
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full border transition-transform ${
                isScrubbing
                  ? 'scale-115 border-[#FFFFFF] bg-[#00FFFF] text-[#060A0F] shadow-[0_0_20px_rgba(0,255,255,0.85)]'
                  : 'border-[#00FFFF] bg-[#0A131C]/95 text-[#00FFFF] shadow-[0_0_12px_rgba(0,255,255,0.45)]'
              }`}
              style={{ top: `${Math.min(100, Math.max(0, scrollProgress * 100)).toFixed(2)}%` }}
            >
              <GripHorizontal className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      )}

      {/* Compact Scroll-Driven Holographic Resume Cards */}
      <HologramInspectorModal
        resume={resume}
        activeCard={cardState.activeCard}
        revealAmount={cardState.revealAmount}
        enterT={cardState.enterT}
        exitT={cardState.exitT}
        pedestalMode={pedestalMode}
        onSelectPedestalMode={(m) => {
          ambientAudio.playPulse();
          setPedestalMode(m);
        }}
      />

      {/* Touch Darker + Subtle 5-10% Blurred Backdrop & Frosted ~30% Blurred Transparent Neutral Card */}
      {cvModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cv-modal-title"
          onClick={() => setCvModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/28 backdrop-blur-[2px]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="cv-modal-pop relative w-full max-w-[490px] rounded-2xl border border-white/18 bg-[#121417]/48 p-5 sm:p-6 backdrop-blur-[18px] shadow-[0_24px_64px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.12)]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/12 pb-3.5">
              <div className="space-y-1">
                <p className="font-mono-hud text-[10px] tracking-[0.2em] text-[#00FFFF]">
                  {resume.ui.cvModalTag}
                </p>
                <h2 id="cv-modal-title" className="font-display-hud text-xl sm:text-2xl font-medium text-[#FFFFFF]">
                  {resume.ui.cvModalTitle}
                </h2>
                <p className="text-xs sm:text-[13px] text-[#C8CFD6] leading-relaxed">
                  {resume.ui.cvModalSubtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCvModalOpen(false)}
                aria-label={resume.ui.closeModal}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/[0.06] text-[#D8E0E8] hover:border-[#00FFFF] hover:text-[#FFFFFF] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#00FFFF]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href={resume.cvDownloads.enUrl}
                download="Sam_Moradian_CV_EN.pdf"
                onClick={() => {
                  ambientAudio.playPulse();
                  window.setTimeout(() => setCvModalOpen(false), 180);
                }}
                className="group relative flex flex-col justify-between gap-3 rounded-xl border border-white/15 bg-black/28 backdrop-blur-md p-4 transition-all hover:-translate-y-0.5 hover:border-[#00FFFF]/75 hover:bg-white/[0.08] hover:shadow-[0_0_24px_rgba(0,255,255,0.16)] focus-visible:outline-2 focus-visible:outline-[#00FFFF]"
              >
                <div className="flex items-center justify-between gap-2">
                  <UkFlagIcon className="w-7 h-[18px] shrink-0 rounded-[2px] ring-1 ring-white/25" />
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/25 bg-white/10 text-[#FFFFFF] group-hover:border-[#00FFFF] group-hover:bg-[#00FFFF] group-hover:text-[#080C12] transition-colors">
                    <Download className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="font-display-hud text-base font-medium text-[#FFFFFF]">
                    {resume.ui.cvEnTitle}
                  </p>
                  <p className="font-mono-hud text-[10.5px] text-[#AEB6BE] leading-snug">
                    {resume.ui.cvEnDesc}
                  </p>
                </div>
              </a>

              <a
                href={resume.cvDownloads.deUrl}
                download="Sam_Moradian_CV_DE.pdf"
                onClick={() => {
                  ambientAudio.playPulse();
                  window.setTimeout(() => setCvModalOpen(false), 180);
                }}
                className="group relative flex flex-col justify-between gap-3 rounded-xl border border-white/15 bg-black/28 backdrop-blur-md p-4 transition-all hover:-translate-y-0.5 hover:border-[#00FFFF]/75 hover:bg-white/[0.08] hover:shadow-[0_0_24px_rgba(0,255,255,0.16)] focus-visible:outline-2 focus-visible:outline-[#00FFFF]"
              >
                <div className="flex items-center justify-between gap-2">
                  <DeFlagIcon className="w-7 h-[18px] shrink-0 rounded-[2px] ring-1 ring-white/25" />
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/25 bg-white/10 text-[#FFFFFF] group-hover:border-[#00FFFF] group-hover:bg-[#00FFFF] group-hover:text-[#080C12] transition-colors">
                    <Download className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="font-display-hud text-base font-medium text-[#FFFFFF]">
                    {resume.ui.cvDeTitle}
                  </p>
                  <p className="font-mono-hud text-[10.5px] text-[#AEB6BE] leading-snug">
                    {resume.ui.cvDeDesc}
                  </p>
                </div>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 2200vh Scroll Driver for unhurried 5-chapter journey & smooth portal transformations */}
      <main className="relative z-0 pointer-events-none" aria-hidden="true">
        <div className="h-[2200vh]" />
      </main>
    </div>
  );
}
