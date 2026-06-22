import { useState } from 'react';
import type { LightboxSlide } from '@/lib/lightbox/types';
import { Icon } from '@/components/ui/Icon';

export function LightboxInfoCard({ 
  slide, 
  onEdit, 
  onDelete, 
  onSetCover,
  onDownload,
  onShare
}: { 
  slide: LightboxSlide,
  onEdit?: (id: string) => void,
  onDelete?: (id: string) => void,
  onSetCover?: (id: string) => void,
  onDownload?: (slide: LightboxSlide) => void,
  onShare?: (slide: LightboxSlide) => void
}) {
  const [expanded, setExpanded] = useState(false);

  if (!slide) return null;

  return (
    <div className="relative z-10 px-4 pb-4 mb-[96px] md:mb-[112px] max-w-2xl mx-auto w-full">
      <div
        className="bg-black/60 backdrop-blur-md rounded-xl p-4 text-white hover:bg-black/70 transition-colors shadow-2xl border border-white/10"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(!expanded)}>
            {slide.title && (
              <h3 className="text-lg font-semibold truncate">{slide.title}</h3>
            )}
            {slide.groupName && (
              <p className="text-sm text-white/70 truncate">{slide.groupName}</p>
            )}
          </div>
          
          <div className="flex items-center gap-1.5 flex-shrink-0">
             {onDownload && (
               <button 
                onClick={(e) => { e.stopPropagation(); onDownload(slide); }} 
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
               >
                 <Icon name="download" className="w-4 h-4" />
               </button>
             )}
             {onShare && (
               <button 
                onClick={(e) => { e.stopPropagation(); onShare(slide); }} 
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
               >
                 <Icon name="share" className="w-4 h-4" />
               </button>
             )}
             <button 
              onClick={() => setExpanded(!expanded)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors ml-1"
             >
              <Icon name="chevron-down" className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
             </button>
          </div>
        </div>

        {expanded && (
          <>
            <div className="mt-3 pt-3 border-t border-white/10 space-y-1 text-sm text-white/60">
              {slide.price && <p>💰 {slide.price}</p>}
              {slide.itemCode && <p>🔖 {slide.itemCode}</p>}
              {slide.description && <p className="mt-2 text-white/80 leading-relaxed">{slide.description}</p>}
            </div>

            {/* Actions for Admins */}
            {(onEdit || onSetCover || onDelete) && (
              <div className="flex items-center gap-2 pt-3 mt-3 border-t border-white/10 justify-end">
                {onEdit && (
                  <button onClick={() => onEdit(slide.id)} className="p-2 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30">
                    <Icon name="pencil" className="w-4 h-4" />
                  </button>
                )}
                {onSetCover && (
                  <button onClick={() => onSetCover(slide.id)} className="p-2 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30">
                    <Icon name="check-circle" className="w-4 h-4" />
                  </button>
                )}
                {onDelete && (
                  <button onClick={() => onDelete(slide.id)} className="p-2 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30">
                    <Icon name="trash-2" className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
