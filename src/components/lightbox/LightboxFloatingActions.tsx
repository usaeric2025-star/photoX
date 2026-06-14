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
      className={`flex items-center justify-center gap-3 h-10 sm:h-12 px-4 sm:px-6 rounded-full backdrop-blur-xl border shadow-2xl active:scale-[0.96] transition-all group pointer-events-auto ${
        showInfo 
          ? "bg-white/20 border-white/40 text-white" 
          : "bg-black/20 border-white/10 text-white/70 hover:text-white hover:bg-black/30"
      }`}
      title={showInfo ? (appLang === 'zh' ? '关闭信息' : appLang === 'ms' ? 'Tutup Maklumat' : 'Close Info') : (appLang === 'zh' ? '展开详细信息' : appLang === 'ms' ? 'Tunjuk Butiran' : 'Show Details')}
    >
      <Info size={18} className={showInfo ? "text-brand-yellow scale-110" : "group-hover:scale-110 transition-transform"} />
      <span className="hidden sm:inline text-[10px] font-black tracking-[0.2em] uppercase">
        {showInfo 
          ? (appLang === 'zh' ? '收起详情' : appLang === 'ms' ? 'Tutup Butiran' : 'Hide Details')
          : (appLang === 'zh' ? '属性细节' : appLang === 'ms' ? 'Butiran Atribut' : 'Attributes')}
      </span>
    </button>
  );
}
