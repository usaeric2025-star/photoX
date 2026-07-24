import { useAtomValue, useSetAtom } from 'jotai';
import { 
  lightboxSlidesAtom, 
  lightboxCurrentIndexAtom, 
  openLightboxAtom,
  closeLightboxAtom 
} from '#src/store/index.js';
export * from './types.js';
import { LightboxSlide } from './types.js';
import { useFilters } from '#src/hooks/index.js';
import { useParams } from 'react-router-dom';

export function useLightbox() {
  const slides = useAtomValue(lightboxSlidesAtom);
  const currentIndex = useAtomValue(lightboxCurrentIndexAtom);
  const openAction = useSetAtom(openLightboxAtom);
  const setLightboxData = useSetAtom(lightboxSlidesAtom);
  const clearLightboxData = useSetAtom(closeLightboxAtom);
  const setLightboxIndex = useSetAtom(lightboxCurrentIndexAtom);
  
  
  
  
  const { photoId: queryPhotoId, setPhotoId, modal } = useFilters();
  const routeParams = useParams<{ photoId?: string }>();
  
  const photoId = queryPhotoId || routeParams?.photoId || null;

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
    openAction({ slides, index });
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
