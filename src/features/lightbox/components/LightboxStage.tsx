import { motion, AnimatePresence } from 'lite-sleek';
import { getPhotoThumb } from '#src/lib/image/thumbnailConfig.js';
import { Image } from '#src/components/ui/Image.js';
import { Photo } from '#src/types/photo.js';
import { useLightboxInteractions } from '#src/hooks/ui/useLightboxInteractions.js';
import { useLightbox } from '#lib/lightbox/index.js';

export function LightboxStage() {
  const { slides: lightboxSlides, currentIndex: lightboxCurrentIndex, next, prev, clearLightboxData } = useLightbox();
  
  const currentPhoto = lightboxSlides[lightboxCurrentIndex];

  const {
    isZoomed,
    isSwiping,
    dragOffset,
    handlers,
    handleToggleZoom,
  } = useLightboxInteractions({
    currentIndex: lightboxCurrentIndex,
    onNext: next,
    onPrev: prev,
    minSwipeDistance: 50,
  });

  if (!currentPhoto) return null;

  // Derive photo data
  const photoData = ('original' in currentPhoto ? currentPhoto.original : currentPhoto) as Photo;
  const title = photoData.name || 'Photo';
  const key = photoData.imageUrl || photoData.uri || '';
  const hash = photoData.imageHash;
  
  // Use standardized thumb helper
  const src = getPhotoThumb(key, 'LG', hash);

  return (
    <div 
      className="flex-1 relative flex items-center justify-center overflow-hidden touch-none"
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
              transform: isSwiping ? `translateX(${dragOffset}px)` : 'translateX(0px)',
              transition: isSwiping ? 'none' : 'transform 250ms cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
          >
            <div 
              className="w-full h-full flex items-center justify-center cursor-pointer"
              onDoubleClick={handleToggleZoom}
              onClick={(e) => {
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
