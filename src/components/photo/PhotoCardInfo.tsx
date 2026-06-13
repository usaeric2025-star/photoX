import React from 'react';

interface PhotoCardInfoProps {
  hideDetails: boolean;
  displayCatName?: string;
  photoTags?: string[];
}

export const PhotoCardInfo = ({ hideDetails, displayCatName, photoTags }: PhotoCardInfoProps) => {
  if (hideDetails) return null;

  return (
    <div className="absolute bottom-0 left-0 w-full pointer-events-auto p-1.5 sm:p-2.5 pt-4 sm:pt-6 flex flex-col gap-0.5 sm:gap-1 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent">
      {displayCatName && (
        <div className="px-0.5">
          <span className="text-[7px] sm:text-[8px] bg-slate-950/40 backdrop-blur-md text-white/95 px-1 py-0.2 sm:px-2 sm:py-0.5 rounded-full font-black tracking-wider sm:tracking-widest uppercase shadow-sm inline-flex items-center gap-0.5 sm:gap-1 border border-white/10">
            <span className="w-0.5 sm:w-1 h-0.5 sm:h-1 rounded-full bg-brand-gold shrink-0 shadow-[0_0_6px_rgba(212,168,83,0.8)] animate-pulse" />
            {displayCatName}
          </span>
        </div>
      )}

      {photoTags && photoTags.length > 0 && (
        <div className="flex flex-nowrap items-center gap-0.5 sm:gap-1 overflow-x-auto no-scrollbar scroll-smooth pb-0.2 px-0.5">
          {photoTags.map(tag => (
            <span 
              key={tag} 
              className="shrink-0 text-[7px] sm:text-[7.5px] bg-white/5 backdrop-blur-sm text-slate-200 px-1 py-0.2 sm:px-1.5 sm:py-0.5 rounded-full font-bold tracking-wider uppercase border border-white/5 whitespace-nowrap shadow-sm transition-colors duration-200 hover:bg-white/20"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

