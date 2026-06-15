import { Reel } from '@reelkit/react';
import { OptimizedImage } from '@/components/shared/OptimizedImage';

interface ThumbnailsStripProps {
  items: Array<{ src: string; thumbnail?: string; alt?: string; id?: string }>;
  currentIndex: number;
  onSelect: (index: number) => void;
  apiRef?: React.MutableRefObject<any>;
}

export const ThumbnailsStrip = ({ items, currentIndex, onSelect, apiRef }: ThumbnailsStripProps) => {
  return (
    <div className="absolute bottom-6 left-0 right-0 z-50 px-4 flex justify-center pointer-events-none">
      <div className="bg-black/45 backdrop-blur-xl rounded-2xl border border-white/10 p-2 shadow-2xl pointer-events-auto h-20 w-full sm:max-w-md">
        <Reel
          count={items.length}
          initialIndex={currentIndex}
          direction="horizontal"
          transitionDuration={200}
          loop={false}
          swipeDistanceFactor={0.12}
          apiRef={apiRef}
          style={{ width: '100%', height: '100%' }}
          itemBuilder={(index) => {
            const item = items[index];
            const isActive = index === currentIndex;
            return (
              <div key={item.id ?? index} className="flex items-center justify-center w-full h-full">
                <button
                  type="button"
                  onClick={() => onSelect(index)}
                  className={`
                    w-16 h-12 mx-1 rounded-md overflow-hidden transition-all duration-200
                    flex-shrink-0
                    ${isActive 
                      ? 'ring-2 ring-white scale-110 shadow-lg' 
                      : 'opacity-60 hover:opacity-100'
                    }
                  `}
                >
                  <OptimizedImage
                    src={item.thumbnail || item.src}
                    alt={item.alt || ''}
                    className="w-full h-full object-cover"
                    eager={isActive}
                  />
                </button>
              </div>
            );
          }}
          afterChange={(newIndex) => {
            if (newIndex !== currentIndex) {
              onSelect(newIndex);
            }
          }}
        />
      </div>
    </div>
  );
};

