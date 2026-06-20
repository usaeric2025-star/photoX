import React, { useRef } from 'react';
import { Globe, ChevronDown } from '@/components/ui/Icon';
import { useUIStore } from '@/store/useUIStore';
import { useDisclosure } from '@/hooks/core/useDisclosure';
import { useClickOutside } from '@/hooks/core/useClickOutside';

import { NativePopover } from '@/components/ui/NativePopover';

export function LanguageSwitcher({ mode = 'buttons' }: { mode?: 'buttons' | 'dropdown' | 'segmented' }) {
  const appLang = useUIStore((s) => s.appLang);
  const update = useUIStore((s) => s.update);

  const langs = [
    { code: 'zh', label: '中文' },
    { code: 'en', label: 'EN' },
    { code: 'ms', label: 'BM' }
  ];

  if (mode === 'dropdown') {
    const currentLabel = langs.find(l => l.code === appLang)?.label || 'EN';
    return (
      <NativePopover
        align="end"
        trigger={
          <button 
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
          >
            <Globe size={14} className="text-slate-500" />
            <span className="text-[11px] font-black uppercase text-slate-700">{currentLabel}</span>
            <ChevronDown size={12} className="text-slate-400" />
          </button>
        }
      >
        <div className="py-1">
          {langs.map(l => (
            <button
              key={l.code}
              onClick={() => {
                update({ appLang: l.code as any });
              }}
              className={`w-[calc(100%-8px)] mx-1 mb-0.5 last:mb-0 text-left px-3 py-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-between ${
                appLang === l.code 
                  ? 'text-white bg-slate-900 shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {l.label}
              {appLang === l.code && <div className="w-1.5 h-1.5 bg-white rounded-full shadow-sm" />}
            </button>
          ))}
        </div>
      </NativePopover>
    );
  }

  if (mode === 'segmented') {
    return (
      <div className="flex items-center bg-slate-100/80 p-1 rounded-2xl h-10 w-full max-w-[240px]">
        {langs.map(l => (
          <button
            key={l.code}
            onClick={(e) => {
              e.stopPropagation();
              update({ appLang: l.code as any });
            }}
            className={`flex-1 flex items-center justify-center h-full rounded-xl text-[11px] font-black tracking-tight transition-all duration-300 ${
              appLang === l.code 
                ? 'bg-white text-brand-navy shadow-sm scale-[1.02]' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center p-1 rounded-full border border-brand-navy/20 bg-white/80 backdrop-blur-lg shadow-sm overflow-hidden h-10 sm:h-11">
      {langs.map(l => (
        <button 
          key={l.code} 
          onClick={() => update({ appLang: l.code as any })} 
          className={`relative flex-1 px-3 sm:px-6 h-full flex items-center justify-center rounded-full text-[10px] sm:text-[13px] font-black uppercase tracking-wider transition-all duration-500 ${
            appLang === l.code 
              ? 'bg-brand-navy text-white shadow-[0_4px_12px_rgba(var(--brand-navy-rgb),0.3)] scale-[1.05]' 
              : 'text-brand-navy/40 hover:text-brand-navy/70 hover:bg-white/50'
          }`}
        >
          <span className="relative">{l.code === 'zh' ? '中文' : l.code.toUpperCase()}</span>
          {appLang === l.code && (
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-full opacity-50" />
          )}
        </button>
      ))}
    </div>
  );
}
