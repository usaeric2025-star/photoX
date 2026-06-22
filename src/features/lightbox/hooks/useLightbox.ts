import { useEffect } from 'react';
import type { LightboxSlide } from '@/lib/lightbox';

export function useLightboxPreloader(slides: LightboxSlide[], currentIndex: number) {
  useEffect(() => {
    if (!slides.length) return;
    
    const nextIndex = (currentIndex + 1) % slides.length;
    const nextSlide = slides[nextIndex];
    
    if (nextSlide && nextSlide.src) {
      const img = new Image();
      img.src = nextSlide.src;
    }
  }, [currentIndex, slides]);
}
