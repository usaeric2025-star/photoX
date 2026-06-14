import { useRef, useEffect } from 'react';

interface ThumbnailsStripProps {
  items: Array<{ src: string; thumbnail?: string; alt?: string; id?: string }>;
  currentIndex: number;
  onSelect: (index: number) => void;
}

export const ThumbnailsStrip = ({ items, currentIndex, onSelect }: ThumbnailsStripProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // CSS Scroll Snap + 自動滾動到當前縮圖
  useEffect(() => {
    const activeBtn = document.getElementById(`lightbox-thumb-${currentIndex}`);
    if (activeBtn) {
      activeBtn.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [currentIndex]);

  if (!items || items.length <= 1) return null;

  return (
    <div
      ref={scrollRef}
      className="fixed bottom-24 sm:bottom-8 left-1/2 -translate-x-1/2 z-[110] pointer-events-auto max-w-[90vw] sm:max-w-2xl px-3 py-2 bg-black/45 backdrop-blur-xl rounded-2xl border border-white/10 flex items-center gap-2 overflow-x-auto shadow-2xl transition-all duration-300 snap-x snap-mandatory"
      style={{ scrollbarWidth: 'none' }}
    >
      {items.map((item, idx) => {
        const isActive = idx === currentIndex;
        return (
          <button
            key={item.id ?? idx}
            id={`lightbox-thumb-${idx}`}
            onClick={() => onSelect(idx)}
            className={`
              relative flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden transition-all duration-300
              snap-center ring-2
              ${isActive 
                ? 'ring-white scale-110 shadow-lg opacity-100 z-10' 
                : 'ring-transparent hover:ring-white/40 opacity-40 hover:opacity-80'
              }
            `}
          >
            <img
              src={item.thumbnail || item.src}
              alt={item.alt || ''}
              className="w-full h-full object-cover pointer-events-none select-none"
              loading="lazy"
            />
          </button>
        );
      })}
    </div>
  );
};
