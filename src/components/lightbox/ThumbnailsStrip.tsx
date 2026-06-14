import React, { useRef, useEffect } from 'react';
import { type LightboxItem } from '@reelkit/react-lightbox';

interface ThumbnailsStripProps {
  items: Array<LightboxItem & { thumbnail?: string }>;
  currentIndex: number;
  onSelect: (index: number) => void;
}

export const ThumbnailsStrip = ({ items, currentIndex, onSelect }: ThumbnailsStripProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Use requestAnimationFrame to ensure the active thumbnail exists in the DOM
    const frameId = requestAnimationFrame(() => {
      const activeThumb = document.getElementById(`lightbox-thumb-${currentIndex}`);
      if (activeThumb) {
        activeThumb.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    });
    return () => cancelAnimationFrame(frameId);
  }, [currentIndex]);

  if (!items || items.length <= 1) return null;

  return (
    <div 
      ref={scrollRef}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[110] pointer-events-auto max-w-[90vw] sm:max-w-2xl px-3 py-2 bg-black/45 backdrop-blur-xl rounded-2xl border border-white/10 flex items-center gap-2 overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-none shadow-2xl transition-all duration-300"
    >
      {items.map((item, idx) => {
        const isActive = idx === currentIndex;
        return (
          <button
            key={idx}
            type="button"
            id={`lightbox-thumb-${idx}`}
            onClick={() => onSelect(idx)}
            className={`relative w-12 h-12 rounded-lg overflow-hidden shrink-0 snap-center transition-all duration-300 ring-2 ${
              isActive 
                ? 'ring-white scale-110 shadow-lg opacity-100 z-10' 
                : 'ring-transparent hover:ring-white/40 opacity-40 hover:opacity-80'
            }`}
          >
            <img 
              src={item.thumbnail || item.src} 
              alt={(item as any).alt || ''} 
              className="w-full h-full object-cover pointer-events-none select-none"
              loading="lazy"
            />
          </button>
        );
      })}
    </div>
  );
};
