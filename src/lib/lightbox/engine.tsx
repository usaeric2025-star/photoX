import React from 'react';
import { useLightbox } from '@/lib/lightbox/index';
import { LightboxDriver } from './drivers/lightboxDriver';
import type { LightboxSlide } from './types';

interface LightboxEngineProps {
  onClose?: () => void;
  onView?: (index: number) => void;
}

export function LightboxEngine({ 
  onClose, 
  onView,
}: LightboxEngineProps) {
  const lightbox = useLightbox();

  const handleClose = () => {
    lightbox.closeLightbox();
    onClose?.();
  };

  const handleView = (index: number) => {
    if (index === lightbox.currentIndex) return;
    lightbox.setLightboxIndex(index);
    onView?.(index);
  };

  if (!lightbox.isOpen) return null;

  return (
    <LightboxDriver 
      state={{
        isOpen: lightbox.isOpen,
        slides: lightbox.slides,
        currentIndex: lightbox.currentIndex,
        config: {},
      }} 
      onClose={handleClose}
      onView={handleView}
    />
  );
}
