import { useEffect, useRef } from 'react';
import { getThumbnailUrl } from '#src/services/mappers/utils.js';
import { getPhotoThumb } from '#src/lib/image/thumbnailConfig.js';
import { Image } from '#src/components/ui/Image.js';

interface LightboxThumbnailsProps {
  photos: any[];
  currentIndex: number;
  isOpen: boolean;
  onSelect: (index: number) => void;
}

export function LightboxThumbnails({
  photos,
  currentIndex,
  isOpen,
  onSelect
}: LightboxThumbnailsProps) {
  const thumbnailContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll thumbnails when currentIndex changes
  useEffect(() => {
    if (thumbnailContainerRef.current) {
      const container = thumbnailContainerRef.current;
      const activeThumb = container.children[currentIndex] as HTMLElement | undefined;
      if (activeThumb) {
        const containerCenter = container.clientWidth / 2;
        const thumbCenter = activeThumb.offsetLeft + (activeThumb.clientWidth / 2);
        container.scrollTo({
          left: thumbCenter - containerCenter,
          behavior: 'smooth'
        });
      }
    }
  }, [currentIndex, isOpen]);

  if (photos.length <= 1) return null;

  return (
    <div className="h-[84px] bg-black/95 border-t border-white/5 flex items-center justify-center z-[130] shrink-0">
      <div 
        ref={thumbnailContainerRef} 
        className="relative flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full px-4 py-2 scroll-smooth"
      >
        {photos.map((p, idx) => {
          const photoData = (p.original || p) as any;
          const key = photoData.imageUrl || photoData.uri || (p as any).src;
          const hash = photoData.imageHash || photoData.image_hash;
          const thumb = getPhotoThumb(key, 'SM', hash);
          const isActive = idx === currentIndex;
          const isNear = Math.abs(idx - currentIndex) <= 2;
          
          return (
            <button
              key={`${key}-${idx}`}
              onClick={() => onSelect(idx)}
              className={`flex-shrink-0 w-16 h-12 sm:w-20 sm:h-14 rounded-xl overflow-hidden border-2 transition-all duration-300 ${isActive ? 'border-blue-500 scale-105 shadow-lg opacity-100' : 'border-transparent opacity-30 active:opacity-60'}`}
              aria-label={`Select photo ${idx + 1}`}
              aria-current={isActive}
            >
              <Image 
                src={thumb} 
                className="w-full h-full object-cover" 
                alt="" 
                disableFade={true} 
                priority={isNear}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
