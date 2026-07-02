import { useState } from 'react';
import { Image } from '#src/components/ui/Image.js';

interface LightboxStageProps {
  currentPhoto: any;
  currentIndex: number;
  totalPhotos: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

export function LightboxStage({
  currentPhoto,
  currentIndex,
  totalPhotos,
  onNext,
  onPrev,
  onClose
}: LightboxStageProps) {
  // Swipe gesture state
  const [pointerStartX, setPointerStartX] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const onPointerDown = (e: React.PointerEvent) => {
    // Only track primary pointer (usually touch or left click)
    if (!e.isPrimary) return;
    setPointerStartX(e.clientX);
    // Capture pointer to track outside bounds
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
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
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const onPointerCancel = (e: React.PointerEvent) => {
    setPointerStartX(null);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (err) {}
  };

  // Derive photo data
  const photoData = (currentPhoto.original || currentPhoto) as any;
  const title = (currentPhoto as any).title || photoData.name || 'Photo';
  const key = photoData.imageUrl || photoData.uri || (currentPhoto as any).src;
  
  // Use high resolution for Lightbox
  const url = new URL(key, window.location.origin);
  if (url.searchParams.has('w')) {
    url.searchParams.set('w', '1200');
  } else {
    url.searchParams.append('w', '1200');
  }
  const src = url.toString();

  // Create LQIP
  const lqipUrl = new URL(key, window.location.origin);
  lqipUrl.searchParams.set('w', '50');
  lqipUrl.searchParams.delete('h');
  const lqipSrc = lqipUrl.toString();

  return (
    <div 
      className="flex-1 relative flex items-center justify-center overflow-hidden touch-none"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onClick={onClose} // Clicking the background closes it
    >
      <div
        key={currentIndex}
        className="absolute inset-0 flex items-center justify-center p-4 sm:p-12 md:p-16"
        onClick={(e) => e.stopPropagation()} // Prevent click from bubbling to background
      >
        {/* Main Image */}
        <div className="relative w-full h-full flex items-center justify-center">
          <Image
            src={src}
            lqipSrc={lqipSrc}
            alt={title}
            disableFade={true}
            loading="eager"
            containerClassName="bg-transparent"
            className="object-contain drop-shadow-2xl"
          />
        </div>
      </div>
    </div>
  );
}
