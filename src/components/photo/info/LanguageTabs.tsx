import React from 'react';
import { cn } from '@/lib/utils';

export type SupportedLanguage = 'zh' | 'en' | 'ms';

interface LanguageTabsProps {
  hasZh: boolean;
  hasEn: boolean;
  hasMs: boolean;
  activeLang: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
}

export function LanguageTabs({ hasZh, hasEn, hasMs, activeLang, onLanguageChange }: LanguageTabsProps) {
  const showToggle = [hasZh, hasEn, hasMs].filter(Boolean).length > 1;
  
  if (!showToggle) return null;

  return (
    <div className="flex bg-slate-100 rounded border border-slate-200 p-0.5">
      {hasZh && (
        <button 
          onClick={() => onLanguageChange('zh')} 
          className={cn("text-[9px] font-bold px-2 py-0.5 rounded transition-all flex items-center gap-1", activeLang === 'zh' ? "bg-white shadow-sm text-slate-800" : "text-slate-400 hover:text-slate-600")}
        >
          ZH
        </button>
      )}
      {hasEn && (
        <button 
          onClick={() => onLanguageChange('en')} 
          className={cn("text-[9px] font-bold px-2 py-0.5 rounded transition-all flex items-center gap-1", activeLang === 'en' ? "bg-white shadow-sm text-slate-800" : "text-slate-400 hover:text-slate-600")}
        >
          EN
        </button>
      )}
      {hasMs && (
        <button 
          onClick={() => onLanguageChange('ms')} 
          className={cn("text-[9px] font-bold px-2 py-0.5 rounded transition-all flex items-center gap-1", activeLang === 'ms' ? "bg-white shadow-sm text-slate-800" : "text-slate-400 hover:text-slate-600")}
        >
          MS
        </button>
      )}
    </div>
  );
}
