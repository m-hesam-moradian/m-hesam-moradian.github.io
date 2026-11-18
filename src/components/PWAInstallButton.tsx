import React, { useState } from 'react';
import { Smartphone, X } from 'lucide-react';
import { LocaleCode } from '../data/resume';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { ambientAudio } from '../utils/ambientAudio';

interface PWAInstallButtonProps {
  locale: LocaleCode;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ locale }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => {
          ambientAudio.playPulse();
          void install();
        }}
        title={locale === 'de' ? 'Als App installieren' : 'Install App'}
        className="pointer-events-auto inline-flex min-h-[34px] items-center gap-1.5 rounded-full border border-[#00FFFF]/50 bg-[#08131B]/92 px-2.5 sm:px-3 py-1 font-mono-hud text-[9.5px] font-medium tracking-[0.14em] text-[#00FFFF] shadow-[0_0_16px_rgba(0,255,255,0.22),inset_0_1px_0_rgba(255,255,255,0.08)] hover:border-[#00FFFF] hover:bg-[#0D212E] hover:text-[#FFFFFF] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#00FFFF]"
      >
        <Smartphone className="h-3.5 w-3.5 text-[#00FFFF]" strokeWidth={2} />
        <span>{locale === 'de' ? 'APP' : 'INSTALL'}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => {
            ambientAudio.playPulse();
            setShowIOSGuide(true);
          }}
          title={locale === 'de' ? 'Auf Startbildschirm' : 'Add App Icon'}
          className="pointer-events-auto inline-flex min-h-[34px] items-center gap-1.5 rounded-full border border-[#00FFFF]/45 bg-[#08131B]/92 px-2.5 py-1 font-mono-hud text-[9.5px] font-medium tracking-[0.14em] text-[#00FFFF] shadow-[0_0_14px_rgba(0,255,255,0.18)] hover:border-[#00FFFF] hover:text-[#FFFFFF] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#00FFFF]"
        >
          <Smartphone className="h-3.5 w-3.5 text-[#00FFFF]" strokeWidth={2} />
          <span>APP</span>
        </button>

        {showIOSGuide && (
          <div
            role="dialog"
            aria-modal="true"
            onClick={() => setShowIOSGuide(false)}
            className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xs rounded-2xl border border-[#00FFFF]/45 bg-[#0A1118]/96 p-5 text-left shadow-[0_18px_48px_rgba(0,0,0,0.88),0_0_24px_rgba(0,255,255,0.22)]"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-mono-hud text-[10px] tracking-[0.18em] text-[#00FFFF]">
                  {locale === 'de' ? 'IOS HOME-ICON' : 'IOS HOME SCREEN'}
                </p>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close"
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[#8A929A] hover:text-[#FFFFFF] cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2.5 text-xs leading-relaxed text-[#D8E4EC]">
                {locale === 'de' ? (
                  <>
                    1. Tippe in Safari auf <strong>Teilen</strong>.<br />
                    2. Wähle <strong>Zum Home-Bildschirm</strong>.
                  </>
                ) : (
                  <>
                    1. Tap the <strong>Share</strong> button in Safari.<br />
                    2. Select <strong>Add to Home Screen</strong>.
                  </>
                )}
              </p>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
