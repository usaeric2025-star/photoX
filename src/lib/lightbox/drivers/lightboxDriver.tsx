import React from 'react';
import { LightboxStyled as LightboxStyledBase } from '@mshafiqyajid/react-lightbox/styled';
const LightboxStyled = LightboxStyledBase as React.ElementType;
import '@mshafiqyajid/react-lightbox/styles.css';

import type { LightboxState, LightboxSlide } from '../types';
import { LightboxInfoCard } from '@/features/lightbox/components/LightboxInfoCard';

interface LightboxDriverProps {
  state: LightboxState;
  onClose: () => void;
  onView?: (index: number) => void;
}

export function LightboxDriver({ 
  state, 
  onClose, 
  onView,
}: LightboxDriverProps) {
  const images = React.useMemo(() => state.slides.map((s) => ({
    src: s.src,
    alt: s.alt ?? '',
    title: s.title,
    description: s.description,
    original: s, 
  })), [state.slides]);

  return (
    <div className="relative w-full h-full">
      <LightboxStyled
        images={images}
        open={state.isOpen}
        onOpenChange={(isOpen: boolean) => !isOpen && onClose()}
        index={state.currentIndex}
        onIndexChange={(index: number) => onView?.(index)}
        showThumbnails={state.config.canThumbnails}
        zoom={true}
        loop={true}
      />
    </div>
  );
}
