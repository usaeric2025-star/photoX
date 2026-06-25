export * from './types';
import { useUI } from '@/lib/store';

export function useLightbox() {
  const isOpen = useUI(s => s.lightboxIsOpen || false);
  const slides = useUI(s => s.lightboxSlides || []);
  const currentIndex = useUI(s => s.lightboxCurrentIndex || 0);
  const openLightbox = useUI(s => s.openLightbox);
  const closeLightbox = useUI(s => s.closeLightbox);
  const setLightboxIndex = useUI(s => s.setLightboxIndex);
  
  return {
    isOpen,
    slides,
    currentIndex,
    openLightbox,
    closeLightbox,
    setLightboxIndex,
    open: openLightbox,
    close: closeLightbox
  };
}

export * from './adapter';
export * from './engine';
