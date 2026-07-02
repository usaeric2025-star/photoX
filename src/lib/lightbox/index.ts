export * from './types.js';
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
    (route.name === 'photo' || route.name === 'adminPhoto' ? (route.params as any).photoId : null);
  const isOpen = !!(photoId && modal !== 'edit');
  
  const open = (slides: any[], index: number = 0) => {
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
    slides,
    currentIndex,
    setLightboxData,
    clearLightboxData,
    setLightboxIndex,
    open,
    close,
  };
}

export * from './adapter.js';
