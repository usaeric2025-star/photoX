import React from 'react';
import { useUIStore } from '@/store/useUIStore';
import { GalleryVariant } from '@/types/variant';

export function LanguageSwitcher({ variant = 'full-management' }: { variant?: GalleryVariant | 'ghost' }) {
  const appLang = useUIStore((s) => s.appLang);
  const update = useUIStore((s) => s.update);

  const langs = [
    { code: 'zh', label: '中文' },
    { code: 'en', label: 'EN' },
    { code: 'ms', label: 'BM' }
  ];

  return (
    <div className={`flex items-center p-0.5 rounded-full border border-brand-navy/10 bg-brand-navy/5 shadow-inner overflow-hidden ${variant === 'ghost' ? 'h-7' : 'h-9'}`}>
      {langs.map(l => (
        <button 
          key={l.code} 
          onClick={() => update({ appLang: l.code as any })} 
          className={`px-3 sm:px-4 h-full flex items-center justify-center rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all ${
            appLang === l.code 
              ? 'bg-brand-navy text-white shadow-md' 
              : 'text-brand-navy/50 hover:text-brand-navy hover:bg-white/50'
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
