import { useEffect, useRef, memo } from 'react';
import { getPhotoThumb } from '#src/lib/image/thumbnailConfig.js';
import { Image } from '#src/components/ui/Image.js';
import { Photo } from '#src/types/photo.js';

interface LightboxThumbnailsProps {
  photos: (Photo | { original: Photo })[];
  currentIndex: number;
  isOpen: boolean;
  showControls?: boolean;
  onSelect: (index: number) => void;
}

export const LightboxThumbnails = memo(function LightboxThumbnails({
  photos,
  currentIndex,
  isOpen,
  showControls = true,
  onSelect
}: LightboxThumbnailsProps) {
  const thumbnailContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll thumbnails when currentIndex changes, isOpen becomes true, or photos length changes
  useEffect(() => {
    if (!isOpen) return;

    const scrollActiveIntoView = () => {
      if (thumbnailContainerRef.current) {
        const container = thumbnailContainerRef.current;
        const activeThumb = container.children[currentIndex] as HTMLElement | undefined;
        if (activeThumb) {
          const containerWidth = container.clientWidth;
          const thumbWidth = activeThumb.clientWidth;
          const thumbLeft = activeThumb.offsetLeft;
          
          if (containerWidth > 0) {
            // Target scroll left puts the thumb in the middle of the container
            const targetScrollLeft = thumbLeft - (containerWidth / 2) + (thumbWidth / 2);
            container.scrollTo({
              left: targetScrollLeft,
              behavior: 'smooth'
            });
          }
        }
      }
    };

    // Use dual-stage delayed scroll triggers to ensure DOM measurements are accurate and layout is fully resolved.
    const timer1 = setTimeout(scrollActiveIntoView, 50);
    const timer2 = setTimeout(scrollActiveIntoView, 150);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [currentIndex, isOpen, photos.length]);

  if (photos.length <= 1) return null;

  return (
    <div className={`h-[84px] bg-black/95 border-t border-white/5 flex items-center justify-center shrink-0 z-20 relative transition-all duration-300 ease-out ${
      showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'
    }`}>
      <div 
        ref={thumbnailContainerRef} 
        className="relative flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full px-4 py-2"
      >
        {photos.map((p, idx) => {
          const photoData = ('original' in p ? p.original : p) as Photo;
          const key = photoData.imageUrl || photoData.uri || '';
          const hash = photoData.imageHash;
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
});
