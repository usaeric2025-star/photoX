import { getPhotoThumb } from '#src/lib/image/thumbnailConfig.js';
import { Image } from '#src/components/ui/Image.js';
import { Photo } from '#src/types/photo.js';
import { useLightboxInteractions } from '../hooks/useLightboxInteractions.js';
import { usePhotoPrefetch } from '../hooks/usePhotoPrefetch.js';
import { useLightbox } from '#lib/lightbox/index.js';
import { GESTURE_CONFIG, ANIMATION_CONFIG } from '#src/constants/config.js';
import { Icon } from '#src/components/ui/Icon.js';

interface LightboxStageProps {
  onTap?: () => void;
}

export function LightboxStage({ onTap }: LightboxStageProps = {}) {
  const { slides: lightboxSlides, currentIndex: lightboxCurrentIndex, next, prev, clearLightboxData } = useLightbox();
  
  const currentPhoto = lightboxSlides[lightboxCurrentIndex];

  const {
    scale,
    position,
    isZoomed,
    isSwiping,
    swipeDirection,
    handlers,
    resetZoom,
  } = useLightboxInteractions({
    currentIndex: lightboxCurrentIndex,
    totalPhotos: lightboxSlides.length,
    onNext: next,
    onPrev: prev,
    onClose: clearLightboxData,
    onTap,
    minSwipeDistance: GESTURE_CONFIG.SWIPE_THRESHOLD,
  });

  // Derive photo data
  const photoData = currentPhoto ? (('original' in currentPhoto ? currentPhoto.original : currentPhoto) as Photo) : null;
  const title = photoData?.name || 'Photo';
  const key = photoData?.imageUrl || photoData?.uri || '';
  const hash = photoData?.imageHash;
  
  // Use standardized thumb helper
  const src = getPhotoThumb(key, 'LG', hash);
  const lqipSrc = getPhotoThumb(key, 'MD', hash);

  // Preload adjacent photos (2 before and 2 after) for seamless slide transitions
  const prefetchUrls = lightboxSlides.map(slide => {
    if (!slide) return '';
    const photo = ('original' in slide ? slide.original : slide) as Photo;
    return getPhotoThumb(photo.imageUrl || photo.uri, 'LG', photo.imageHash);
  });
  usePhotoPrefetch(prefetchUrls, lightboxCurrentIndex, 2);

  if (!currentPhoto || !photoData) return null;

  return (
    <div 
      className="flex-1 relative flex items-center justify-center overflow-hidden touch-none z-10"
      style={{
        backgroundColor: isSwiping && swipeDirection === 'vertical'
          ? `rgba(0, 0, 0, ${Math.max(0.2, 0.9 - Math.abs(position.y) / GESTURE_CONFIG.OPACITY_DIVISOR * 0.7)})`
          : undefined,
        transition: isSwiping ? 'none' : `background-color ${ANIMATION_CONFIG.LITE_SLEEK_DEFAULT}ms ease-out`,
      }}
      {...handlers}
    >

      <div
        key={photoData.id}
        className="absolute inset-0 flex items-center justify-center p-4 sm:p-12 md:p-16 transition-all duration-150"
        onClick={(e) => e.stopPropagation()} // Prevent click from bubbling to background
      >
        {/* Main Image Container */}
        <div 
          className="relative w-full h-full flex items-center justify-center select-none"
          style={{
            transform: isSwiping 
              ? (swipeDirection === 'vertical'
                ? `translateY(${position.y}px) scale(${Math.max(0.75, 1 - Math.abs(position.y) / GESTURE_CONFIG.SCALE_DIVISOR)})`
                : `translateX(${position.x}px)`)
              : `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            opacity: isSwiping && swipeDirection === 'vertical'
              ? Math.max(0.3, 1 - Math.abs(position.y) / 250)
              : 1,
            transition: isSwiping || isZoomed ? 'none' : `transform ${ANIMATION_CONFIG.LITE_SLEEK_DEFAULT}ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity ${ANIMATION_CONFIG.LITE_SLEEK_DEFAULT}ms ease-out`,
            willChange: isSwiping || isZoomed ? 'transform' : 'auto',
          }}
        >
          <div 
            className="w-full h-full flex items-center justify-center"
          >
            <Image
              src={src}
              alt={title}
              lqipSrc={lqipSrc}
              priority={true}
              containerClassName="bg-transparent"
              className={`object-contain max-w-full max-h-full drop-shadow-2xl select-none ${isZoomed ? 'cursor-default' : 'cursor-default'}`}
            />
          </div>
        </div>
      </div>

      {/* Floating Reset Zoom Button in Bottom Right */}
      {isZoomed && (
        <div className="absolute bottom-6 right-6 sm:bottom-8 sm:right-8 z-50">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              resetZoom();
            }}
            className="w-11 h-11 sm:w-12 sm:h-12 bg-white hover:bg-zinc-100 text-zinc-900 rounded-full border border-white/50 shadow-2xl ring-2 ring-black/40 active:scale-90 transition-all select-none cursor-pointer flex items-center justify-center"
            title="恢復默認"
          >
            <Icon name="refresh-ccw" size={22} className="stroke-[2.5] text-zinc-900" />
          </button>
        </div>
      )}
    </div>
  );
}
