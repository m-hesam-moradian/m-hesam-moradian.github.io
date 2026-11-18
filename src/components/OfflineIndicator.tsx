import React, { useEffect, useState } from 'react';
import { LocaleCode } from '../data/resume';

export const OfflineIndicator: React.FC<{ locale: LocaleCode }> = ({ locale }) => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="pointer-events-none fixed bottom-16 left-4 z-40 flex items-center gap-2 rounded-full border border-[#00FFFF]/50 bg-[#081119]/92 px-3 py-1 font-mono-hud text-[9.5px] tracking-[0.14em] text-[#D8FFFF] shadow-[0_6px_20px_rgba(0,0,0,0.8),0_0_14px_rgba(0,255,255,0.2)]"
    >
      <span className="h-2 w-2 rounded-full bg-[#00FFFF] animate-pulse" />
      <span>{locale === 'de' ? 'OFFLINE-MODUS (CACHE)' : 'OFFLINE MODE // CACHED'}</span>
    </div>
  );
};
