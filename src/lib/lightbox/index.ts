export * from './types.js';
import { LightboxSlide } from './types.js';
import { useUI } from '#lib/store/index.js';
import { useFilters } from '#src/hooks/index.js';
import { useAppRoute } from '#lib/router/index.js';

export function useLightbox() {
  const slides = useUI(s => s.lightboxSlides || []);
  const currentIndex = useUI(s => s.lightboxCurrentIndex || 0);
  const setLightboxData = useUI(s => s.setLightboxData);
  const clearLightboxData = useUI(s => s.clearLightboxData);
  const setLightboxIndex = useUI(s => s.setLightboxIndex);
  
  const { photoId: queryPhotoId, setPhotoId, modal } = useFilters();
  const route = useAppRoute();
  
  const photoId = queryPhotoId || 
    (route.name === 'photo' || route.name === 'adminPhoto' ? (route.params as Record<string, string>).photoId : null);
  const isOpen = !!photoId;
  const isEditing = modal === 'edit';
  
  const next = () => {
    if (slides.length <= 1) return;
    const nextIdx = (currentIndex + 1) % slides.length;
    setLightboxIndex(nextIdx);
    
    const nextSlide = slides[nextIdx];
    if (nextSlide?.id) {
      setPhotoId(nextSlide.id);
    }
  };

  const prev = () => {
    if (slides.length <= 1) return;
    const prevIdx = (currentIndex - 1 + slides.length) % slides.length;
    setLightboxIndex(prevIdx);
    
    const prevSlide = slides[prevIdx];
    if (prevSlide?.id) {
      setPhotoId(prevSlide.id);
    }
  };

  const open = (slides: LightboxSlide[], index: number = 0) => {
    setLightboxData(slides, index);
    if (slides[index]?.id) {
      setPhotoId(slides[index].id);
    }
  };

  const close = () => {
    setPhotoId(null);
    clearLightboxData();
  };

  return {
    isOpen,
    isEditing,
    slides,
    currentIndex,
    setLightboxData,
    clearLightboxData,
    setLightboxIndex,
    open,
    close,
    next,
    prev,
  };
}

export * from './adapter.js';
