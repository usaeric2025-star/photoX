import React from 'react';
import { Sparkles } from 'lucide-react';
import { Photo } from '@/types/photo';
import { LanguageTabs, SupportedLanguage } from './LanguageTabs';

interface DescriptionSectionProps {
  photo: Photo;
  hasZh: boolean;
  hasEn: boolean;
  hasMs: boolean;
  descLang: SupportedLanguage;
  setDescLang: (lang: SupportedLanguage) => void;
  displayDesc: string;
  texts: {
    description: string;
    aiGenerated: string;
  };
}

export function DescriptionSection({
  photo,
  hasZh,
  hasEn,
  hasMs,
  descLang,
  setDescLang,
  displayDesc,
  texts
}: DescriptionSectionProps) {
  if (!hasZh && !hasEn && !hasMs) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
          {texts.description}
          {photo.is_ai_described && (
            <Sparkles size={10} className="text-blue-500" aria-label={texts.aiGenerated} />
          )}
        </h4>
        
        <LanguageTabs 
          hasZh={hasZh}
          hasEn={hasEn}
          hasMs={hasMs}
          activeLang={descLang}
          onLanguageChange={setDescLang}
        />
      </div>
      
      <div className="text-sm text-slate-700 leading-relaxed bg-slate-50/50 p-3 rounded-lg border border-slate-100 whitespace-pre-wrap">
        {displayDesc}
      </div>
    </section>
  );
}
