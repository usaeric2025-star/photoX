import React, { useRef } from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';
import { useDisclosure } from '@mantine/hooks';
import { useClickAway } from '@/lib/hooks';

export function LanguageSwitcher({ mode = 'buttons' }: { mode?: 'buttons' | 'dropdown' | 'segmented' }) {
  const appLang = useUIStore((s) => s.appLang);
  const update = useUIStore((s) => s.update);
  const [isOpen, { toggle, close }] = useDisclosure(false);
  const ref = useRef<HTMLDivElement>(null);

  useClickAway(ref as any, () => close());

  const langs = [
    { code: 'zh', label: '中文' },
    { code: 'en', label: 'EN' },
    { code: 'ms', label: 'BM' }
  ];

  if (mode === 'dropdown') {
    const currentLabel = langs.find(l => l.code === appLang)?.label || 'EN';
    return (
      <div className="relative" ref={ref}>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            toggle();
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
        >
          <Globe size={14} className="text-slate-500" />
          <span className="text-[11px] font-black uppercase text-slate-700">{currentLabel}</span>
          <ChevronDown size={12} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full right-0 mt-2 w-32 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-[100] animate-in fade-in zoom-in-95 duration-200">
            {langs.map(l => (
              <button
                key={l.code}
                onClick={(e) => {
                  e.stopPropagation();
                  update({ appLang: l.code as any });
                  close();
                }}
                className={`w-[calc(100%-16px)] mx-2 mb-1 last:mb-0 text-left px-3 py-2.5 rounded-xl text-[11px] font-black transition-all flex items-center justify-between ${
                  appLang === l.code 
                    ? 'text-white bg-brand-navy shadow-md' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {l.label}
                {appLang === l.code && <div className="w-1.5 h-1.5 bg-white rounded-full shadow-sm" />}
              </button>
            ))}
          </div>
        )}
      </div>
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
    <div className="flex items-center p-1 rounded-full border border-brand-navy/20 bg-white/50 backdrop-blur shadow-sm overflow-hidden h-9 sm:h-10">
      {langs.map(l => (
        <button 
          key={l.code} 
          onClick={() => update({ appLang: l.code as any })} 
          className={`flex-1 px-3 sm:px-5 h-full flex items-center justify-center rounded-full text-[10px] sm:text-[12px] font-black uppercase tracking-wider transition-all duration-300 ${
            appLang === l.code 
              ? 'bg-brand-navy text-white shadow-lg scale-[1.02] ring-2 ring-brand-navy/10' 
              : 'text-brand-navy/40 hover:text-brand-navy/70 hover:bg-white/80'
          }`}
        >
          {l.code === 'zh' ? '中文' : l.code.toUpperCase()}
          {appLang === l.code && <div className="absolute -bottom-1 w-1 h-1 bg-white rounded-full sm:hidden" />}
        </button>
      ))}
    </div>
  );
}
