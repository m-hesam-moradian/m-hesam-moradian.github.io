import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, Box, Briefcase, Network, Radio } from 'lucide-react';
import { LocaleCode } from '../data/resume';

interface QuantumBootLoaderProps {
  loadProgress: number;
  loadStageIdx: number;
  locale: LocaleCode;
  onComplete: () => void;
}

const CHAMBER_NODES = [
  { Icon: Box, threshold: 0, en: 'CH.01 // VOLCANIC SUMMIT', de: 'CH.01 // VULKANGIPFEL' },
  { Icon: Network, threshold: 22, en: 'CH.02 // NEURAL DRIFT', de: 'CH.02 // NEURONALES NETZ' },
  { Icon: Briefcase, threshold: 44, en: 'CH.03 // EVENT HORIZON', de: 'CH.03 // EREIGNISHORIZONT' },
  { Icon: BookOpen, threshold: 66, en: 'CH.04 // QUANTUM FIELD', de: 'CH.04 // QUANTENFELD' },
  { Icon: Radio, threshold: 86, en: 'CH.05 // SIGNAL RELAY', de: 'CH.05 // SIGNALRELAIS' },
] as const;

const RING_RADIUS = 72;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// Precomputed 36 precision bezel calibration ticks around the radial gauge
const CALIBRATION_TICKS = Array.from({ length: 36 }, (_, i) => {
  const angle = (i / 36) * Math.PI * 2 - Math.PI / 2;
  const isMajor = i % 3 === 0;
  const rInner = isMajor ? 83 : 85.5;
  const rOuter = 90;
  return {
    x1: (100 + Math.cos(angle) * rInner).toFixed(2),
    y1: (100 + Math.sin(angle) * rInner).toFixed(2),
    x2: (100 + Math.cos(angle) * rOuter).toFixed(2),
    y2: (100 + Math.sin(angle) * rOuter).toFixed(2),
    isMajor,
    threshold: (i / 36) * 100,
  };
});

export const QuantumBootLoader: React.FC<QuantumBootLoaderProps> = ({
  loadProgress,
  loadStageIdx,
  locale,
  onComplete,
}) => {
  const [displayProgress, setDisplayProgress] = useState(0);
  const [exiting, setExiting] = useState(false);

  const targetRef = useRef(loadProgress);
  targetRef.current = Math.min(100, Math.max(0, loadProgress));

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    let rafId = 0;
    let finishTimer = 0;
    let exitTimer = 0;
    let current = 0;
    const startMs = performance.now();
    const minDurationMs = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 260 : 1050;

    const step = (now: number) => {
      const elapsed = now - startMs;
      const timeCap = (elapsed / minDurationMs) * 100;
      // Allow real load progress to guide pacing while guaranteeing a smooth unbroken glide 0 -> 100
      const target = Math.min(targetRef.current, timeCap);
      const delta = target - current;

      if (delta > 0.05) {
        current += Math.max(0.45, delta * 0.16);
      } else if (target >= 99.5) {
        current = 100;
      }

      if (current > 99.6 && targetRef.current >= 100 && elapsed >= minDurationMs) {
        current = 100;
        setDisplayProgress(100);
        finishTimer = window.setTimeout(() => {
          setExiting(true);
          exitTimer = window.setTimeout(() => {
            onCompleteRef.current();
          }, 420);
        }, 180);
        return;
      }

      setDisplayProgress(Math.min(99.5, current));
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(rafId);
      window.clearTimeout(finishTimer);
      window.clearTimeout(exitTimer);
    };
  }, []);

  const roundedPct = Math.round(displayProgress);
  const dashOffset = RING_CIRCUMFERENCE * (1 - displayProgress / 100);
  const stageIdxFromPct = Math.min(
    CHAMBER_NODES.length - 1,
    Math.max(loadStageIdx, Math.floor((displayProgress / 100) * CHAMBER_NODES.length))
  );
  const activeNode = CHAMBER_NODES[stageIdxFromPct] ?? CHAMBER_NODES[0];
  const stageLabel =
    roundedPct >= 100
      ? locale === 'de'
        ? 'SYSTEM BEREIT'
        : 'SYSTEM ONLINE'
      : locale === 'de'
        ? activeNode.de
        : activeNode.en;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={locale === 'de' ? '3D-Portfolio wird geladen' : 'Loading 3D Portfolio'}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={roundedPct}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#090D12] px-6 transition-all duration-400 ease-out select-none ${
        exiting ? 'pointer-events-none opacity-0 scale-[1.025]' : 'opacity-100 scale-100'
      }`}
      style={{
        backgroundImage:
          'radial-gradient(circle at 50% 46%, rgba(0, 255, 255, 0.08) 0%, rgba(12, 18, 26, 0.94) 44%, #070A0F 100%)',
      }}
    >
      {/* Subtle HUD scanline grid texture */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 holo-scanlines opacity-30"
      />

      {/* Minimal Top Identity Stamp */}
      <div className="absolute top-6 sm:top-8 left-1/2 -translate-x-1/2 flex items-center gap-3">
        <span className="h-[1px] w-6 sm:w-10 bg-gradient-to-r from-transparent to-[#00FFFF]/60" />
        <p className="font-mono-hud text-[9.5px] sm:text-[10px] tracking-[0.3em] text-[#8FA2B2] whitespace-nowrap">
          SAM MORADIAN // OBSIDIAN ENGINE
        </p>
        <span className="h-[1px] w-6 sm:w-10 bg-gradient-to-l from-transparent to-[#00FFFF]/60" />
      </div>

      {/* =================================================================== */}
      {/* CENTERPIECE: ICONIC MONOLITH CUBE + QUANTUM ORBITS + RADIAL GAUGE   */}
      {/* =================================================================== */}
      <div className="relative flex flex-col items-center">
        <div className="relative flex h-48 w-48 sm:h-56 sm:w-56 items-center justify-center rounded-full bg-[#0C1219] shadow-[14px_18px_36px_rgba(0,0,0,0.88),-6px_-6px_18px_rgba(255,255,255,0.03),inset_0_1px_0_rgba(255,255,255,0.06)] border border-white/[0.06]">
          {/* Recessed inner cavity */}
          <div className="relative flex h-[164px] w-[164px] sm:h-[190px] sm:w-[190px] items-center justify-center rounded-full bg-[#070B10] shadow-[inset_6px_8px_18px_rgba(0,0,0,0.92),inset_-3px_-3px_10px_rgba(0,255,255,0.06)]">
            <svg
              viewBox="0 0 200 200"
              className="h-full w-full overflow-visible"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="loaderCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#9EFFFF" />
                  <stop offset="50%" stopColor="#00FFFF" />
                  <stop offset="100%" stopColor="#00A8BD" />
                </linearGradient>
                <filter id="loaderCyanGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="2.8" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* 36 Calibration ticks along outer bezel */}
              {CALIBRATION_TICKS.map((tick, idx) => {
                const lit = displayProgress >= tick.threshold;
                return (
                  <line
                    key={idx}
                    x1={tick.x1}
                    y1={tick.y1}
                    x2={tick.x2}
                    y2={tick.y2}
                    stroke={lit ? '#00FFFF' : 'rgba(138, 146, 154, 0.25)'}
                    strokeWidth={tick.isMajor ? '1.6' : '1'}
                    strokeLinecap="round"
                    style={{ transition: 'stroke 160ms linear' }}
                  />
                );
              })}

              {/* Track ring */}
              <circle
                cx="100"
                cy="100"
                r={RING_RADIUS}
                fill="none"
                stroke="rgba(0, 255, 255, 0.1)"
                strokeWidth="3.5"
              />

              {/* Active radial progress arc */}
              <circle
                cx="100"
                cy="100"
                r={RING_RADIUS}
                fill="none"
                stroke="url(#loaderCyanGrad)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 100 100)"
                filter="url(#loaderCyanGlow)"
              />

              {/* Counter-rotating quantum orbital ellipses */}
              <g className="loader-orbit-cw" style={{ transformOrigin: '100px 100px' }}>
                <ellipse
                  cx="100"
                  cy="100"
                  rx="54"
                  ry="20"
                  fill="none"
                  stroke="rgba(0, 255, 255, 0.34)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  transform="rotate(-28 100 100)"
                />
                <circle cx="147" cy="76" r="2.6" fill="#D8FFFF" filter="url(#loaderCyanGlow)" />
              </g>

              <g className="loader-orbit-ccw" style={{ transformOrigin: '100px 100px' }}>
                <ellipse
                  cx="100"
                  cy="100"
                  rx="54"
                  ry="20"
                  fill="none"
                  stroke="rgba(184, 252, 255, 0.28)"
                  strokeWidth="1"
                  transform="rotate(32 100 100)"
                />
                <circle cx="53" cy="72" r="2.2" fill="#00FFFF" filter="url(#loaderCyanGlow)" />
              </g>

              {/* Iconic Center Isometric Cyan Monolith Cube + Inner Energy Core */}
              <g filter="url(#loaderCyanGlow)">
                {/* Outer hexagon silhouette */}
                <polygon
                  points="100,72 124,86 124,114 100,128 76,114 76,86"
                  fill="rgba(0, 255, 255, 0.06)"
                  stroke="#00FFFF"
                  strokeWidth="1.75"
                  strokeLinejoin="round"
                />
                {/* Isometric cube interior edges */}
                <polyline
                  points="76,86 100,100 124,86"
                  fill="none"
                  stroke="#9EFFFF"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
                <line
                  x1="100"
                  y1="100"
                  x2="100"
                  y2="128"
                  stroke="#9EFFFF"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
                {/* Inner Singularity Core Diamond scaling with progress */}
                <polygon
                  points="100,90 109,100 100,110 91,100"
                  fill="#00FFFF"
                  fillOpacity={0.22 + (displayProgress / 100) * 0.78}
                  stroke="#E0FFFF"
                  strokeWidth="1"
                />
              </g>
            </svg>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 5-CHAMBER ICONIC PROGRESS DOCK (Mirrors Bottom Chapter Switcher)  */}
        {/* ================================================================= */}
        <div className="mt-7 inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-white/[0.07] bg-[#0D1218]/95 px-2 py-1.5 shadow-[8px_10px_22px_rgba(0,0,0,0.84),-3px_-3px_10px_rgba(255,255,255,0.045),inset_0_1px_0_rgba(255,255,255,0.06)]">
          {CHAMBER_NODES.map(({ Icon, threshold }, idx) => {
            const isOnline = displayProgress >= threshold;
            const isCurrent = idx === stageIdxFromPct && roundedPct < 100;
            return (
              <div
                key={idx}
                className={`relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full transition-all duration-300 ${
                  isOnline
                    ? 'bg-gradient-to-b from-[#3BFFFF] via-[#00E4F2] to-[#00A8BD] text-[#04131B] shadow-[0_2px_10px_rgba(0,255,255,0.38),inset_2px_2px_5px_rgba(0,48,60,0.38),inset_-2px_-2px_5px_rgba(255,255,255,0.55)]'
                    : 'text-[#556370]'
                } ${isCurrent ? 'scale-105' : ''}`}
              >
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={isOnline ? 2.25 : 1.75} />
              </div>
            );
          })}
        </div>

        {/* ================================================================= */}
        {/* STAGE READOUT + TABULAR PERCENTAGE + LASER PROGRESS TRACK         */}
        {/* ================================================================= */}
        <div className="mt-5 w-64 sm:w-72 space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono-hud text-[10px] tracking-[0.2em] text-[#A8BCC9] truncate">
              {stageLabel}
            </span>
            <span className="font-mono-hud text-sm font-semibold tracking-widest text-[#00FFFF] drop-shadow-[0_0_10px_rgba(0,255,255,0.55)]">
              {String(roundedPct).padStart(3, '0')}%
            </span>
          </div>

          <div className="relative h-[3px] w-full overflow-hidden rounded-full bg-[#19232E]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#00A8BD] via-[#00FFFF] to-[#D8FFFF] shadow-[0_0_12px_rgba(0,255,255,0.75)]"
              style={{ width: `${displayProgress.toFixed(1)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
