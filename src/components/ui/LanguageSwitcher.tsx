import React from 'react';
import { Icon } from '@/components/ui/Icon';
import { useUI, UIStoreState } from '@/lib/store';
import { NativePopover } from '@/components/ui/NativePopover';
import { appQuery } from '@/lib/query';
import { queryKeys } from '@/lib/query/keys';

export function LanguageSwitcher({ mode = 'buttons' }: { mode?: 'buttons' | 'dropdown' | 'segmented' | 'lightbox' }) {
  const appLang = useUI((s: UIStoreState) => s.appLang);
  const patch = useUI((s: UIStoreState) => s.patch);

  const langs: { code: 'zh' | 'en' | 'ms'; label: string }[] = [
    { code: 'zh', label: '中文' },
    { code: 'en', label: 'EN' },
    { code: 'ms', label: 'BM' }
  ];

  const handleLangChange = (lang: 'zh' | 'en' | 'ms') => {
    patch({ appLang: lang });
    appQuery.mutate(queryKeys.categories.all);
  };

  if (mode === 'lightbox') {
    const currentLabel = langs.find(l => l.code === appLang)?.label || 'EN';
    return (
      <NativePopover
        align="end"
        trigger={
          <button 
            className="flex items-center justify-center gap-1 w-auto px-2.5 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-all active:scale-95 text-white cursor-pointer"
            title="Switch Language"
            onClick={(e) => e.stopPropagation()}
          >
            <Icon name="globe" size={15} className="opacity-70" />
            <span className="text-[11px] font-bold tracking-wider">{currentLabel}</span>
          </button>
        }
      >
        <div className="py-1">
          {langs.map(l => (
            <button
              key={l.code}
              onClick={() => handleLangChange(l.code)}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors cursor-pointer ${
                appLang === l.code ? 'text-blue-600 font-semibold bg-blue-50/50' : 'text-slate-600'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </NativePopover>
    );
  }

  if (mode === 'dropdown') {
    const currentLabel = langs.find(l => l.code === appLang)?.label || 'EN';
    return (
      <NativePopover
        align="end"
        trigger={
          <button 
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
          >
            <Icon name="globe" size={14} className="text-slate-500" />
            <span className="text-[11px] font-black uppercase text-slate-700">{currentLabel}</span>
            <Icon name="chevron-down" size={12} className="text-slate-400" />
          </button>
        }
      >
        <div className="py-1">
          {langs.map(l => (
            <button
              key={l.code}
              onClick={() => handleLangChange(l.code)}
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
            type="button"
            onClick={(e) => handleLangChange(l.code)}
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
          onClick={() => handleLangChange(l.code)} 
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
