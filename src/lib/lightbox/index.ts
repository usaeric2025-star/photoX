import { useAtomValue } from 'jotai';
import { lightboxSlidesAtom, lightboxCurrentIndexAtom } from '#src/store/index.js';
export * from './types.js';
import { setLightboxData, clearLightboxData, setLightboxIndex } from '#lib/store/index.js';
import { LightboxSlide } from './types.js';
import { } from '#lib/store/index.js';
import { useFilters } from '#src/hooks/index.js';
import { useRoute } from 'wouter';

export function useLightbox() {
  const slides = useAtomValue(lightboxSlidesAtom);
  const currentIndex = useAtomValue(lightboxCurrentIndexAtom);
  
  
  
  
  const { photoId: queryPhotoId, setPhotoId, modal } = useFilters();
  const [isPhotoRoute, params] = useRoute<{ photoId: string }>('/photo/:photoId');
  const [isAdminPhotoRoute, adminParams] = useRoute<{ photoId: string }>('/admin/photo/:photoId');
  
  const photoId = queryPhotoId || 
    (isPhotoRoute ? params?.photoId : (isAdminPhotoRoute ? adminParams?.photoId : null));

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
    setLightboxData(slides);
    setLightboxIndex(index);
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
