import { useEffect } from 'react';
import { LightboxImage } from '../PhotoLightbox';

export function useLightboxPreloader(images: LightboxImage[], currentIndex: number) {
  useEffect(() => {
    if (!images.length) return;
    
    const nextIndex = (currentIndex + 1) % images.length;
    const nextImage = images[nextIndex];
    
    if (nextImage) {
      const img = new Image();
      img.src = nextImage.src;
    }
  }, [currentIndex, images]);
}
