import React from 'react';
import { Tag } from '@/types';

interface PhotoCardInfoProps {
  hideDetails: boolean;
  displayCatName?: string;
  photoTags?: Tag[];
}

export const PhotoCardInfo = ({ hideDetails, displayCatName, photoTags }: PhotoCardInfoProps) => {
  if (hideDetails) return null;

  return (
    <div className="absolute bottom-0 left-0 w-full pointer-events-none p-2 sm:p-2.5 pt-6 sm:pt-10 flex flex-col gap-1 sm:gap-1.5 bg-gradient-to-t from-black/85 via-black/40 to-transparent">
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pointer-events-auto px-0.5">
        {displayCatName && (
          <span className="shrink-0 text-[8px] sm:text-[9.5px] bg-brand-gold text-slate-950 px-1.5 py-0.5 rounded-sm font-black tracking-tighter uppercase shadow-md flex items-center leading-none whitespace-nowrap">
            {displayCatName}
          </span>
        )}
        
        {photoTags && photoTags.length > 0 && (
          <div className="flex items-center gap-1">
            {photoTags.map(tag => (
              <span 
                key={tag.id} 
                className="shrink-0 text-[8px] sm:text-[9px] bg-white/20 backdrop-blur-md text-white px-1.5 py-0.5 rounded-sm font-bold tracking-tight uppercase border border-white/20 whitespace-nowrap shadow-sm leading-none"
              >
                #{tag.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

