export * from './types';
import { useUI } from '@/lib/store';
import { useFilters } from '@/hooks';

export function useLightbox() {
  const slides = useUI(s => s.lightboxSlides || []);
  const currentIndex = useUI(s => s.lightboxCurrentIndex || 0);
  const setLightboxData = useUI(s => s.setLightboxData);
  const clearLightboxData = useUI(s => s.clearLightboxData);
  const setLightboxIndex = useUI(s => s.setLightboxIndex);
  
  const { photoId, setPhotoId, modal } = useFilters();
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

export * from './adapter';
