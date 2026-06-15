import { useRef, useEffect } from 'react';

interface PhotoItem {
  id: string;
  thumbnail: string;
  title: string;
}

interface ThumbRailProps {
  items: PhotoItem[];
  currentIndex: number;
  onSelect: (index: number) => void;
}

export function ThumbRail({ items, currentIndex, onSelect }: ThumbRailProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, items.length);
  }, [items]);

  // 滾動到當前縮圖（不受 scale 干擾）
  useEffect(() => {
    const container = railRef.current;
    const activeItem = itemRefs.current[currentIndex];
    if (container && activeItem) {
      const containerRect = container.getBoundingClientRect();
      const itemRect = activeItem.getBoundingClientRect();
      
      let scrollLeft = container.scrollLeft + (itemRect.left - containerRect.left) - (containerRect.width / 2) + (itemRect.width / 2);
      const maxScroll = container.scrollWidth - container.clientWidth;
      scrollLeft = Math.max(0, Math.min(scrollLeft, maxScroll));
      
      container.scrollTo({
        left: scrollLeft,
        behavior: 'smooth',
      });
    }
  }, [currentIndex]);

  if (items.length <= 1) return null;

  return (
    <div className="fixed bottom-6 left-0 right-0 z-[60] px-4 pointer-events-none select-none">
      <div className="relative mx-auto max-w-screen-md w-full">
        {/* 透明度漸變邊緣 */}
        <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-black/60 to-transparent z-10 rounded-l-2xl pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-black/60 to-transparent z-10 rounded-r-2xl pointer-events-none" />
        
        <div className="bg-black/45 backdrop-blur-xl rounded-2xl border border-white/10 p-2 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] pointer-events-auto overflow-hidden">
          <div
            ref={railRef}
            className="flex gap-2 overflow-x-auto no-scrollbar"
            style={{ 
              scrollbarWidth: 'none', 
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {items.map((item, idx) => (
              <button
                key={item.id}
                ref={(el) => { itemRefs.current[idx] = el; }}
                onClick={() => onSelect(idx)}
                className={`
                  w-20 h-14 md:w-24 md:h-16 rounded-md overflow-hidden flex-shrink-0
                  transition-all duration-200
                  ${idx === currentIndex 
                    ? 'ring-2 ring-white shadow-lg z-10' 
                    : 'opacity-60 hover:opacity-100'
                  }
                `}
              >
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  draggable={false}
                  loading={idx === currentIndex ? 'eager' : 'lazy'}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
