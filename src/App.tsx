/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, GripHorizontal, Network, Orbit, Radio, Volume2, VolumeX } from 'lucide-react';
import { HologramInspectorModal, ScrollCardKind } from './components/HologramInspectorModal';
import { DETAILED_CHAMBERS } from './data/portfolioSections';
import { RESUME_DATA } from './data/resume';
import { PedestalMode } from './three/detailedChambers';
import { ObsidianCyanScene } from './three/ObsidianCyanScene';
import { ambientAudio } from './utils/ambientAudio';
import { ScrambleText } from './utils/scrambleText';

const CHAMBER_ICONS = [Box, Network, Orbit, Radio] as const;

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
  // CH.02 // ABOUT ME (neural hold 0.19..0.265, then sweeps into framing while About Me card opens cleanly 0.265..0.41)
  if (progress >= 0.265 && progress <= 0.41) {
    const enterT = smoothstep(0.265, 0.295, progress);
    const exitT = smoothstep(0.375, 0.41, progress);
    return {
      activeCard: 'about',
      revealAmount: enterT * (1 - exitT),
      enterT,
      exitT,
    };
  }

  // CH.03 // WORK (enters 0.585->0.63, holds on left half while Reactor sits right, fades out 0.695->0.73)
  if (progress >= 0.585 && progress <= 0.73) {
    const enterT = smoothstep(0.585, 0.63, progress);
    const exitT = smoothstep(0.695, 0.73, progress);
    return {
      activeCard: 'work',
      revealAmount: enterT * (1 - exitT),
      enterT,
      exitT,
    };
  }

  // CH.04 // CONTACT (opens at pedestal 0.815->0.845, holds 0.845..0.908, fades cleanly before overhead halo teleport 0.908->0.932)
  if (progress >= 0.815 && progress <= 0.932) {
    const enterT = smoothstep(0.815, 0.845, progress);
    const exitT = smoothstep(0.908, 0.932, progress);
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
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [hudHidden, setHudHidden] = useState(false);
  const lastLoopWrapRef = useRef(0);
  const jumpAnimRef = useRef<number | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);

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

      // Seamless infinite loop: once sky descent lands right at Stage 1 (>= 0.994), wrap back to top
      if (progress >= 0.994 && Date.now() - lastLoopWrapRef.current > 700) {
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
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') {
        setHudHidden((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
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

  // Slower, cinematic cubic-eased scroll glide when clicking capsule chapter buttons
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
      const durationMs = Math.max(1250, Math.min(2700, 1100 + fraction * 1650));
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

  const activeChamber = DETAILED_CHAMBERS[activeChamberIdx] ?? DETAILED_CHAMBERS[0];
  const cardState = getScrollCardState(scrollProgress);

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

      {/* Portal Core Teleport Flash (pure-cyan energy saturation across Neuron & Reactor portals) */}
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
          {/* Top Row: Clean Chapter Stamp Left, Crisp Identity Right */}
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-0.5">
              <p className="font-mono-hud text-xs font-medium tracking-widest text-[#FFFFFF]">
                <ScrambleText text={activeChamber.hudTitle} />
              </p>
              <p className="font-mono-hud text-[10px] tracking-wider text-[#00FFFF]">
                <ScrambleText text={activeChamber.sectionTag} durationMs={320} />
              </p>
            </div>

            <div className="flex items-center gap-3 text-right">
              <div className="hidden sm:block space-y-0.5">
                <p className="font-mono-hud text-[11px] tracking-widest text-[#00FFFF]">
                  {RESUME_DATA.identity.name.toUpperCase()}
                </p>
                <p className="font-mono-hud text-[10px] text-[#8A929A]">
                  {RESUME_DATA.identity.role}
                </p>
              </div>
              {isOrbiting && (
                <button
                  type="button"
                  onClick={() => setCameraResetNonce((n) => n + 1)}
                  className="pointer-events-auto font-mono-hud text-[10px] tracking-wider border border-[#8A929A]/50 bg-[#121417]/80 px-2.5 py-1 text-[#FFFFFF] hover:border-[#00FFFF] hover:text-[#00FFFF] transition-colors cursor-pointer"
                >
                  RESET VIEW
                </button>
              )}
            </div>
          </div>

          {/* Quiet Initial Scroll Prompt (fades out cleanly once user scrolls past 4%) */}
          {scrollProgress < 0.04 && (
            <div
              aria-hidden="true"
              className="mx-auto flex flex-col items-center gap-2 opacity-75 transition-opacity"
            >
              <span className="font-mono-hud text-[10px] tracking-[0.22em] text-[#00FFFF]">
                SCROLL TO EXPLORE
              </span>
              <span className="h-5 w-[1px] bg-gradient-to-b from-[#00FFFF] to-transparent" />
            </div>
          )}

          {/* Bottom Row: Quiet Sound Toggle Left + Floating Capsule 01-04 Dock Center + Progress Readout Right */}
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
              <span className="hidden sm:inline">{soundEnabled ? 'AUDIO ON' : 'AUDIO OFF'}</span>
            </button>

            {/* Centered Dark Pill Capsule Dock (01..04 Icon Switcher with Bright Active Circle) */}
            <nav
              aria-label="Chapter Navigation"
              className="pointer-events-auto absolute left-1/2 -translate-x-1/2 bottom-0 inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-[#8A929A]/30 bg-[#0D1219]/92 px-2 py-1.5 backdrop-blur-md shadow-[0_10px_32px_rgba(0,0,0,0.75)]"
            >
              {DETAILED_CHAMBERS.map((ch, idx) => {
                const isActive = idx === activeChamberIdx;
                const Icon = CHAMBER_ICONS[idx] ?? Box;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => handleJumpChamber(idx)}
                    aria-label={`${ch.hudTitle} (${ch.sectionTag})`}
                    title={ch.hudTitle}
                    className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-[#00FFFF] ${
                      isActive
                        ? 'bg-[#FFFFFF] text-[#080C12] shadow-[0_0_18px_rgba(0,255,255,0.45)] scale-105'
                        : 'text-[#8A929A] hover:text-[#FFFFFF] hover:bg-[#FFFFFF]/10'
                    }`}
                  >
                    <Icon className="w-4 h-4 sm:w-[18px] sm:h-[18px]" strokeWidth={isActive ? 2.25 : 1.75} />
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

      {/* Full-Height Right-Edge Vertical Progress Scrubber + Draggable Mobile/Desktop Thumb Button */}
      {!hudHidden && (
        <div className="fixed right-2 sm:right-4 top-14 bottom-16 z-30 flex items-center select-none">
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

            {/* Subtle Chapter Tick Dots along Rail */}
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

      {/* 1400vh Scroll Driver for liquid neural ride, chapter holds & seamless sky-descent loop */}
      <main className="relative z-0 pointer-events-none" aria-hidden="true">
        <div className="h-[1400vh]" />
      </main>
    </div>
  );
}
