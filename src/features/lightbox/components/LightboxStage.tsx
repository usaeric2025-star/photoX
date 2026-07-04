import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'lite-sleek';
import { getPhotoThumb } from '#src/lib/image/thumbnailConfig.js';
import { Image } from '#src/components/ui/Image.js';
import { Photo } from '#src/types/photo.js';

interface LightboxStageProps {
  currentPhoto: Photo | { original: Photo };
  currentIndex: number;
  totalPhotos: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  photos: (Photo | { original: Photo })[];
}

export function LightboxStage({
  currentPhoto,
  currentIndex,
  totalPhotos,
  onNext,
  onPrev,
  onClose,
  photos
}: LightboxStageProps) {
  // Swipe gesture state
  const [pointerStartX, setPointerStartX] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  
  const minSwipeDistance = 50;

  // Reset state when active photo index changes
  useEffect(() => {
    setIsZoomed(false);
    setDragOffset(0);
    setIsSwiping(false);
  }, [currentIndex]);

  const onPointerDown = (e: React.PointerEvent) => {
    // Only track primary pointer (usually touch or left click) and don't drag if zoomed in
    if (!e.isPrimary || isZoomed) return;
    setPointerStartX(e.clientX);
    setDragOffset(0);
    setIsSwiping(true);
    // Capture pointer to track outside bounds
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (pointerStartX === null) return;
    const diff = e.clientX - pointerStartX;
    setDragOffset(diff);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (pointerStartX === null) return;
    
    const diff = e.clientX - pointerStartX;
    if (diff > minSwipeDistance) {
      onPrev();
    } else if (diff < -minSwipeDistance) {
      onNext();
    }
    
    setPointerStartX(null);
    setDragOffset(0);
    setIsSwiping(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (err) {}
  };

  const onPointerCancel = (e: React.PointerEvent) => {
    setPointerStartX(null);
    setDragOffset(0);
    setIsSwiping(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (err) {}
  };

  const handleToggleZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsZoomed(!isZoomed);
  };

  // Derive photo data
  const photoData = ('original' in currentPhoto ? currentPhoto.original : currentPhoto) as Photo;
  const title = photoData.name || 'Photo';
  const key = photoData.imageUrl || photoData.uri || '';
  const hash = photoData.imageHash;
  
  // Use standardized thumb helper
  const src = getPhotoThumb(key, 'LG', hash);
  const lqipSrc = getPhotoThumb(key, 'SM', hash);

  const nextIdx = (currentIndex + 1) % totalPhotos;
  const prevIdx = (currentIndex - 1 + totalPhotos) % totalPhotos;

  const getSlideInfo = (slide: Photo | { original: Photo } | undefined) => {
    if (!slide) return { key: '', hash: '' };
    const d = ('original' in slide ? slide.original : slide) as Photo;
    return {
      key: d.imageUrl || d.uri || '',
      hash: d.imageHash
    };
  };

  const nextInfo = getSlideInfo(photos[nextIdx]);
  const prevInfo = getSlideInfo(photos[prevIdx]);

  const nextSrc = nextInfo.key ? getPhotoThumb(nextInfo.key, 'LG', nextInfo.hash) : '';
  const prevSrc = prevInfo.key ? getPhotoThumb(prevInfo.key, 'LG', prevInfo.hash) : '';

  // Preload adjacent images with a slight delay to prioritize current image
  useEffect(() => {
    const timer = setTimeout(() => {
      if (nextSrc) {
        const imgNext = new window.Image();
        imgNext.src = nextSrc;
      }
      if (prevSrc) {
        const imgPrev = new window.Image();
        imgPrev.src = prevSrc;
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [nextSrc, prevSrc]);

  return (
    <div 
      className="flex-1 relative flex items-center justify-center overflow-hidden touch-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onClick={onClose} // Clicking the background closes it
    >
      <AnimatePresence>
        <motion.div
          key={photoData.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 1 }} // Keep the old image opaque while the new one fades in on top
          transition="opacity 0.25s ease-out"
          className="absolute inset-0 flex items-center justify-center p-4 sm:p-12 md:p-16"
          onClick={(e) => e.stopPropagation()} // Prevent click from bubbling to background
        >
          {/* Main Image Container */}
          <div 
            className="relative w-full h-full flex items-center justify-center select-none"
            style={{
              transform: isSwiping ? `translateX(${dragOffset}px)` : 'translateX(0px)',
              transition: isSwiping ? 'none' : 'transform 250ms cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
          >
            <div 
              className="w-full h-full flex items-center justify-center cursor-pointer"
              onDoubleClick={handleToggleZoom}
              onClick={(e) => {
                // On touch devices single tap can toggle zoom, or just double-click
                // For safety and compatibility with onClose, we stop propagation of click on the image
                e.stopPropagation();
              }}
            >
              <Image
                src={src}
                alt={title}
                priority={true}
                containerClassName="bg-transparent"
                className={`object-contain max-w-full max-h-full drop-shadow-2xl transition-all duration-300 select-none ${isZoomed ? 'scale-150 cursor-zoom-out' : 'scale-100 cursor-zoom-in'}`}
              />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>


    </div>
  );
}
