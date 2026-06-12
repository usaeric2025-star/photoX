import React from 'react';
import { Info } from 'lucide-react';

interface LightboxFloatingActionsProps {
  showInfo: boolean;
  setShowInfo: (show: boolean) => void;
  appLang: string;
}

export function LightboxFloatingActions({
  showInfo,
  setShowInfo,
  appLang
}: LightboxFloatingActionsProps) {
  return (
    <button
      onClick={() => setShowInfo(!showInfo)}
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute bottom-[10px] right-4 md:bottom-[12px] md:right-6 z-[var(--z-dropdown)] flex items-center justify-center gap-2 w-10 h-10 md:w-auto md:px-4 md:py-2 rounded-full bg-black/70 backdrop-blur-xl text-white border border-white/20 shadow-2xl hover:bg-black/90 active:scale-[0.96] transition-all group pointer-events-auto"
      title={showInfo ? (appLang === 'zh' ? '关闭信息' : appLang === 'ms' ? 'Tutup Maklumat' : 'Close Info') : (appLang === 'zh' ? '展开详细信息' : appLang === 'ms' ? 'Tunjuk Butiran' : 'Show Details')}
    >
      <div className="md:hidden flex items-center justify-center">
        {showInfo ? <span className="font-bold text-lg leading-none">✕</span> : <Info size={18} />}
      </div>
      <div className="hidden md:flex items-center gap-2">
        <Info size={16} className={showInfo ? "opacity-50" : "group-hover:scale-110 transition-transform"} />
        <span className="text-xs font-bold tracking-wide">
          {showInfo 
            ? (appLang === 'zh' ? '关闭详情' : appLang === 'ms' ? 'Tutup Butiran' : 'Close Details')
            : (appLang === 'zh' ? '属性信息' : appLang === 'ms' ? 'Maklumat Atribut' : 'Attributes')}
        </span>
      </div>
    </button>
  );
}
