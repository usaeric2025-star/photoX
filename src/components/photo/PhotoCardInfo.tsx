import React from 'react';

interface PhotoCardInfoProps {
  hideDetails: boolean;
  displayCatName?: string;
  photoTags?: string[];
}

export const PhotoCardInfo = ({ hideDetails, displayCatName, photoTags }: PhotoCardInfoProps) => {
  if (hideDetails) return null;

  return (
    <div className="absolute bottom-0 left-0 w-full z-20 pointer-events-auto p-1.5 pt-6 flex flex-col gap-1.5 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
      {displayCatName && (
        <div className="px-0.5">
          <span className="text-[8.5px] bg-black/65 backdrop-blur-[2px] text-white/95 px-2 py-0.5 rounded-md font-bold tracking-wider uppercase shadow-sm inline-flex items-center gap-1 border border-white/10">
            <span className="w-1 h-1 rounded-full bg-brand-gold shrink-0 animate-pulse" />
            {displayCatName}
          </span>
        </div>
      )}

      {photoTags && photoTags.length > 0 && (
        <div className="flex flex-nowrap items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth pb-0.5 px-0.5">
          {photoTags.map(tag => (
            <span 
              key={tag} 
              className="shrink-0 text-[8px] bg-black/75 text-slate-200 px-1.5 py-0.5 rounded-full font-bold tracking-tighter uppercase border border-white/10 whitespace-nowrap"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
