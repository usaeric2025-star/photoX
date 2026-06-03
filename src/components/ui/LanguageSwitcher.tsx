import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';

export function LanguageSwitcher({ mode = 'buttons' }: { mode?: 'buttons' | 'dropdown' | 'segmented' }) {
  const appLang = useUIStore((s) => s.appLang);
  const update = useUIStore((s) => s.update);
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
            setIsOpen(!isOpen);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
        >
          <Globe size={14} className="text-slate-500" />
          <span className="text-[11px] font-black uppercase text-slate-700">{currentLabel}</span>
          <ChevronDown size={12} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full right-0 mt-1 w-28 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-[100]">
            {langs.map(l => (
              <button
                key={l.code}
                onClick={(e) => {
                  e.stopPropagation();
                  update({ appLang: l.code as any });
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-[11px] font-bold transition-colors ${
                  appLang === l.code ? 'text-brand-navy bg-brand-navy/5' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {l.label}
                {appLang === l.code && <span className="ml-2 text-[8px] opacity-40">●</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (mode === 'segmented') {
    return (
      <div className="flex items-center bg-slate-100 p-1 rounded-xl h-9">
        {langs.map(l => (
          <button
            key={l.code}
            onClick={(e) => {
              e.stopPropagation();
              update({ appLang: l.code as any });
            }}
            className={`flex-1 flex items-center justify-center h-full rounded-lg text-[10px] font-bold transition-all ${
              appLang === l.code 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center p-0.5 rounded-full border border-brand-navy/10 bg-brand-navy/5 shadow-inner overflow-hidden h-7 sm:h-9">
      {langs.map(l => (
        <button 
          key={l.code} 
          onClick={() => update({ appLang: l.code as any })} 
          className={`px-2 sm:px-4 h-full flex items-center justify-center rounded-full text-[9px] sm:text-[11px] font-black uppercase tracking-wider transition-all ${
            appLang === l.code 
              ? 'bg-brand-navy text-white shadow-md' 
              : 'text-brand-navy/50 hover:text-brand-navy hover:bg-white/50'
          }`}
        >
          {l.code === 'zh' ? '中文' : l.code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
