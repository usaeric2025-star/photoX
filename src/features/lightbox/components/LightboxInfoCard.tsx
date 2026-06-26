import { useState } from 'react';
import type { LightboxSlide } from '@/lib/lightbox/types';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from '@/hooks/core/useTranslation';
import { useSignal, appLang as appLangSignal } from '@/lib/store';
import { Photo } from '@/types/photo';

export function LightboxInfoCard({ 
  slide, 
  onDownload,
  onShare
}: { 
  slide: LightboxSlide,
  onDownload?: (slide: LightboxSlide) => void,
  onShare?: (slide: LightboxSlide) => void
}) {
  const [expanded, setExpanded] = useState(false);
  const { uiTranslations } = useTranslation();
  const appLang = useSignal(appLangSignal);

  if (!slide) return null;

  const original = slide.original as Photo | undefined;
  
  // Dynamic language resolution
  let displayTitle = slide.title;
  let displayDesc = slide.description;
  
  if (original) {
    if (original.name && typeof original.name === 'object') {
      const nameObj = original.name as Record<string, string>;
      displayTitle = nameObj[appLang] || nameObj.zh || nameObj.en || slide.title;
    }
    if (original.description && typeof original.description === 'object') {
      const descObj = original.description as Record<string, string>;
      displayDesc = descObj[appLang] || descObj.zh || descObj.en || slide.description;
    }
  }

  return (
    <div className="relative z-10 px-4 pb-0 mb-0 max-w-2xl mx-auto w-full">
      <div className="bg-black/60 backdrop-blur-md rounded-xl p-3 text-white hover:bg-black/70 transition-colors shadow-2xl border border-white/10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0 cursor-pointer pl-1" onClick={() => setExpanded(!expanded)}>
            {displayTitle && (
              <h3 className="text-base font-semibold truncate">{displayTitle}</h3>
            )}
            <div className="flex items-center gap-2 mt-0.5">
              {slide.groupName && (
                <p className="text-xs text-white/50 truncate tracking-wide uppercase">{slide.groupName}</p>
              )}
              {slide.itemCode && (
                <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded uppercase font-mono text-white/60">
                  {slide.itemCode}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            {onDownload && (
              <button 
                onClick={(e) => { e.stopPropagation(); onDownload(slide); }} 
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-all active:scale-95"
                title={uiTranslations.download}
              >
                <Icon name="download" className="w-4 h-4" />
              </button>
            )}
            {onShare && (
              <button 
                onClick={(e) => { e.stopPropagation(); onShare(slide); }} 
                className="w-9 h-9 flex items-center justify-center rounded-full bg-primary hover:opacity-90 transition-all active:scale-95 text-text-on-primary"
                title={uiTranslations.shareAndInquiry}
              >
                <Icon name="share" className="w-4.5 h-4.5" />
              </button>
            )}
            <button 
              onClick={() => setExpanded(!expanded)}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
              title={uiTranslations.details}
            >
              <Icon name="info" className="w-4.5 h-4.5 opacity-70" />
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-white/10 space-y-3 px-1 pb-1">
            {slide.price && (
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <span className="text-xs uppercase opacity-60 font-medium">{uiTranslations.estimatedPrice}</span>
                <span className="text-lg">{slide.price}</span>
              </div>
            )}
            {displayDesc && (
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">{uiTranslations.productDescription}</span>
                <p className="text-sm text-white/80 leading-relaxed font-light whitespace-pre-wrap">{displayDesc}</p>
              </div>
            )}
            {original && (
              <div className="grid grid-cols-2 gap-4 mt-4 border-t border-white/5 pt-3">
                {original.dimensions && original.dimensions.length > 0 && (
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-white/40 tracking-wider mb-1">Dimensions</span>
                    <span className="text-sm text-white/80">
                      {original.dimensions.map((d, i) => (
                        <div key={i}>{d.label ? `${d.label}: ` : ''}{d.length}x{d.width}x{d.height} {d.unit}</div>
                      ))}
                    </span>
                  </div>
                )}
                {original.model_number && (
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-white/40 tracking-wider mb-1">Model</span>
                    <span className="text-sm text-white/80 font-mono">{original.model_number}</span>
                  </div>
                )}
                {original.note && !displayDesc && (
                  <div className="col-span-2">
                    <span className="block text-[10px] uppercase font-bold text-white/40 tracking-wider mb-1">Note</span>
                    <span className="text-sm text-white/80 whitespace-pre-wrap">{original.note}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
