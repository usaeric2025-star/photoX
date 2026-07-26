import { useEffect, useRef, memo } from 'react';
import { getPhotoThumb } from '#src/lib/image/thumbnailConfig.js';
import { Image } from '#src/components/ui/Image.js';
import { Photo } from '#src/types/photo.js';
import { useFixedVirtualTrack } from '#src/hooks/useFixedVirtualTrack.js';

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

  const { virtualItems, totalSize, scrollToIndex } = useFixedVirtualTrack({
    count: photos.length,
    itemSize: 80, // 80px width
    gap: 8,       // 8px gap
    padding: 16,  // 16px container px-4 padding
    overscan: 6,
    containerRef: thumbnailContainerRef,
    horizontal: true,
  });

  // Auto-scroll thumbnails when currentIndex changes or when lightbox opens
  const isInitialOpenRef = useRef(true);

  useEffect(() => {
    if (!isOpen) {
      isInitialOpenRef.current = true;
      return;
    }

    const isInitial = isInitialOpenRef.current;
    const behavior = isInitial ? 'auto' : 'smooth';

    let rafId1: number;
    let rafId2: number;

    const alignThumbnails = () => {
      scrollToIndex(currentIndex, { align: 'center', behavior, force: true });
      if (isInitial) {
        isInitialOpenRef.current = false;
      }
    };

    // Use double requestAnimationFrame to ensure DOM layout measurements (clientWidth) are stable
    rafId1 = requestAnimationFrame(() => {
      rafId2 = requestAnimationFrame(() => {
        alignThumbnails();
      });
    });

    return () => {
      cancelAnimationFrame(rafId1);
      cancelAnimationFrame(rafId2);
    };
  }, [currentIndex, isOpen, scrollToIndex]);

  if (photos.length <= 1) return null;

  return (
    <div className={`h-[84px] bg-black/95 border-t border-white/5 flex items-center justify-center shrink-0 z-20 relative transition-[opacity,transform] duration-300 cubic-bezier(0.16,1,0.3,1) ${
      showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
    }`}>
      <div 
        ref={thumbnailContainerRef} 
        className="relative flex items-center overflow-x-auto no-scrollbar w-full h-full"
      >
        <div
          style={{
            width: `${totalSize}px`,
            height: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map((virtualItem) => {
            const idx = virtualItem.index;
            const p = photos[idx];
            if (!p) return null;
            const photoData = ('original' in p ? p.original : p) as Photo;
            const photoId = photoData.id || '';
            const key = photoData.imageUrl || photoData.uri || '';
            const hash = photoData.imageHash;
            const thumb = getPhotoThumb(key, 'SM', hash);
            const isActive = idx === currentIndex;
            const isPriority = Math.abs(idx - currentIndex) <= 2;
            
            return (
              <button
                key={`${photoId || key}-${idx}`}
                onClick={() => onSelect(idx)}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: 0,
                  transform: `translate3d(${virtualItem.start}px, -50%, 0)`,
                  width: '80px',
                  height: '56px',
                }}
                className={`flex-shrink-0 rounded-lg overflow-hidden transition-[opacity,transform,ring] duration-200 ease-out cursor-pointer ${
                  isActive
                    ? 'opacity-100 ring-2 ring-blue-500 ring-offset-1 ring-offset-black scale-[1.02]'
                    : 'opacity-40 scale-100'
                }`}
                aria-label={`Select photo ${idx + 1}`}
                aria-current={isActive}
              >
                <Image 
                  src={thumb} 
                  className="w-full h-full object-cover pointer-events-none" 
                  alt="" 
                  disableFade={true} 
                  priority={isPriority}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});

