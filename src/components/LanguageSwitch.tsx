import React from 'react';
import { LocaleCode } from '../data/resume';

interface LanguageSwitchProps {
  locale: LocaleCode;
  onChange: (nextLocale: LocaleCode) => void;
}

export const UkFlagIcon: React.FC<{ className?: string }> = ({
  className = 'w-5 h-3.5 shrink-0 rounded-[2px] ring-1 ring-white/25',
}) => (
  <svg
    viewBox="0 0 60 36"
    preserveAspectRatio="xMidYMid slice"
    className={className}
    aria-hidden="true"
  >
    <rect width="60" height="36" fill="#012169" />
    <path d="M0 0 L60 36 M60 0 L0 36" stroke="#FFFFFF" strokeWidth="7" />
    <path d="M0 0 L60 36 M60 0 L0 36" stroke="#C8102E" strokeWidth="3.2" />
    <path d="M30 0 V36 M0 18 H60" stroke="#FFFFFF" strokeWidth="11" />
    <path d="M30 0 V36 M0 18 H60" stroke="#C8102E" strokeWidth="6.2" />
  </svg>
);

export const DeFlagIcon: React.FC<{ className?: string }> = ({
  className = 'w-5 h-3.5 shrink-0 rounded-[2px] ring-1 ring-white/25',
}) => (
  <svg
    viewBox="0 0 60 36"
    preserveAspectRatio="xMidYMid slice"
    className={className}
    aria-hidden="true"
  >
    <rect width="60" height="12" y="0" fill="#101216" />
    <rect width="60" height="12" y="12" fill="#DD0000" />
    <rect width="60" height="12" y="24" fill="#FFCE00" />
  </svg>
);

export const LanguageSwitch: React.FC<LanguageSwitchProps> = ({ locale, onChange }) => {
  const isGerman = locale === 'de';

  return (
    <div
      role="group"
      aria-label="Language toggle"
      className="pointer-events-auto inline-flex items-center gap-2 select-none"
    >
      <button
        type="button"
        onClick={() => onChange('en')}
        aria-label="Switch language to English"
        className={`font-mono-hud text-[11px] font-semibold tracking-wider transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#00FFFF] ${
          !isGerman ? 'text-[#FFFFFF]' : 'text-[#6B7684] hover:text-[#B8C4D0]'
        }`}
      >
        EN
      </button>

      <button
        type="button"
        role="switch"
        aria-checked={isGerman}
        aria-label={isGerman ? 'Switch language to English' : 'Sprache auf Deutsch wechseln'}
        onClick={() => onChange(isGerman ? 'en' : 'de')}
        className="relative inline-flex h-[26px] w-[52px] shrink-0 items-center rounded-full border-2 border-[#FFFFFF]/90 p-[2px] shadow-[0_0_16px_rgba(0,255,255,0.22),0_4px_14px_rgba(0,0,0,0.65)] transition-all hover:border-[#00FFFF] hover:shadow-[0_0_20px_rgba(0,255,255,0.4)] cursor-pointer focus-visible:outline-2 focus-visible:outline-[#00FFFF] overflow-hidden"
      >
        {/* Full-bleed Flag Background inside Pill Track */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
          {isGerman ? (
            <DeFlagIcon className="h-full w-full" />
          ) : (
            <UkFlagIcon className="h-full w-full" />
          )}
          <span className="absolute inset-0 rounded-full shadow-[inset_0_2px_5px_rgba(0,0,0,0.55)]" />
        </span>

        {/* Sliding White Thumb Knob (Left = EN, Right = DE) */}
        <span
          aria-hidden="true"
          className={`relative z-10 block h-[18px] w-[18px] rounded-full bg-[#FFFFFF] shadow-[0_2px_6px_rgba(0,0,0,0.65)] transition-transform duration-300 ease-out ${
            isGerman ? 'translate-x-[26px]' : 'translate-x-0'
          }`}
        />
      </button>

      <button
        type="button"
        onClick={() => onChange('de')}
        aria-label="Sprache auf Deutsch wechseln"
        className={`font-mono-hud text-[11px] font-semibold tracking-wider transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#00FFFF] ${
          isGerman ? 'text-[#FFFFFF]' : 'text-[#6B7684] hover:text-[#B8C4D0]'
        }`}
      >
        DE
      </button>
    </div>
  );
};
