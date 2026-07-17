import { motion, AnimatePresence } from 'lite-sleek';
import { getPhotoThumb } from '#src/lib/image/thumbnailConfig.js';
import { Image } from '#src/components/ui/Image.js';
import { Photo } from '#src/types/photo.js';
import { useLightboxInteractions } from '#src/hooks/ui/index.js';
import { useLightbox } from '#lib/lightbox/index.js';
import { GESTURE_CONFIG, ANIMATION_CONFIG } from '#src/constants/config.js';

export function LightboxStage() {
  const { slides: lightboxSlides, currentIndex: lightboxCurrentIndex, next, prev, clearLightboxData } = useLightbox();
  
  const currentPhoto = lightboxSlides[lightboxCurrentIndex];

  const {
    scale,
    position,
    isZoomed,
    isSwiping,
    swipeDirection,
    handlers,
    handleToggleZoom,
  } = useLightboxInteractions({
    currentIndex: lightboxCurrentIndex,
    onNext: next,
    onPrev: prev,
    onClose: clearLightboxData,
    minSwipeDistance: GESTURE_CONFIG.SWIPE_THRESHOLD,
  });

  if (!currentPhoto) return null;

  // Derive photo data
  const photoData = ('original' in currentPhoto ? currentPhoto.original : currentPhoto) as Photo;
  const title = photoData.name || 'Photo';
  const key = photoData.imageUrl || photoData.uri || '';
  const hash = photoData.imageHash;
  
  // Use standardized thumb helper
  const src = getPhotoThumb(key, 'LG', hash);
  const lqipSrc = getPhotoThumb(key, 'MD', hash);

  return (
    <div 
      className="flex-1 relative flex items-center justify-center overflow-hidden touch-none"
      style={{
        backgroundColor: isSwiping && swipeDirection === 'vertical'
          ? `rgba(0, 0, 0, ${Math.max(0.2, 0.9 - Math.abs(position.y) / GESTURE_CONFIG.OPACITY_DIVISOR * 0.7)})`
          : undefined,
        transition: isSwiping ? 'none' : `background-color ${ANIMATION_CONFIG.LITE_SLEEK_DEFAULT}ms ease-out`,
      }}
      {...handlers}
      onClick={clearLightboxData} // Clicking the background closes it
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
              transform: isSwiping 
                ? (swipeDirection === 'vertical'
                  ? `translateY(${position.y}px) scale(${Math.max(0.75, 1 - Math.abs(position.y) / GESTURE_CONFIG.SCALE_DIVISOR)})`
                  : `translateX(${position.x}px)`)
                : `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              opacity: isSwiping && swipeDirection === 'vertical'
                ? Math.max(0.3, 1 - Math.abs(position.y) / 250)
                : 1,
              transition: isSwiping || isZoomed ? 'none' : `transform ${ANIMATION_CONFIG.LITE_SLEEK_DEFAULT}ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity ${ANIMATION_CONFIG.LITE_SLEEK_DEFAULT}ms ease-out`,
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
                className={`object-contain max-w-full max-h-full drop-shadow-2xl select-none ${isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
              />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
