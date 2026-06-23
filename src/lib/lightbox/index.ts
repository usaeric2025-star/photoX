export * from './types';
import { useUIStore } from '@/store/uiStore';

export function useLightbox() {
  const isOpen = useUIStore(s => s.lightbox?.isOpen || false);
  const slides = useUIStore(s => s.lightbox?.slides || []);
  const currentIndex = useUIStore(s => s.lightbox?.currentIndex || 0);
  const openLightbox = useUIStore(s => s.openLightbox);
  const closeLightbox = useUIStore(s => s.closeLightbox);
  const setLightboxIndex = useUIStore(s => s.setLightboxIndex);
  
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
