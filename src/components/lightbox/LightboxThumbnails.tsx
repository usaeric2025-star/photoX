import { useRef, useEffect } from 'react';

interface LightboxThumbnailsProps {
  items: Array<{ id: string; thumbnail: string; title: string }>;
  currentIndex: number;
  onSelect: (index: number) => void;
}

export function LightboxThumbnails({ items, currentIndex, onSelect }: LightboxThumbnailsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    // 確保 itemRefs 陣列長度與 items 一致
    itemRefs.current = itemRefs.current.slice(0, items.length);
  }, [items]);

  useEffect(() => {
    // Automatically scroll to the selected thumbnail
    const container = containerRef.current;
    const selectedElement = itemRefs.current[currentIndex];

    if (container && selectedElement) {
      const containerWidth = container.offsetWidth;
      const elementLeft = selectedElement.offsetLeft;
      const elementWidth = selectedElement.offsetWidth;

      // Calculate the scroll position to center the element
      const scrollPosition = elementLeft - (containerWidth / 2) + (elementWidth / 2);

      container.scrollTo({
        left: Math.max(0, scrollPosition),
        behavior: 'smooth'
      });
    }
  }, [currentIndex]);

  if (items.length <= 1) return null;

  return (
    <div className="absolute bottom-6 left-0 right-0 z-10 px-4 flex justify-center pointer-events-none">
      <div className="bg-black/45 backdrop-blur-xl rounded-2xl border border-white/10 p-2 shadow-2xl pointer-events-auto w-full sm:max-w-md overflow-hidden">
        <div 
          ref={containerRef}
          className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth w-full px-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map((item, index) => (
            <button
              key={item.id}
              ref={(el) => { itemRefs.current[index] = el; }}
              type="button"
              onClick={() => onSelect(index)}
              className={`
                w-16 h-12 rounded-md overflow-hidden transition-all flex-shrink-0 duration-200
                ${index === currentIndex ? 'ring-2 ring-white scale-110 shadow-lg my-1' : 'opacity-60 hover:opacity-100'}
              `}
            >
              <img
                src={item.thumbnail}
                alt={item.title}
                loading={index === currentIndex ? 'eager' : 'lazy'}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
