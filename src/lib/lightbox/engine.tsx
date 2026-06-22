import React from 'react';
import { useLightboxStore } from './store';
import { YARLDriver } from './drivers/yarl';
import type { LightboxSlide } from './types';

interface LightboxEngineProps {
  onClose?: () => void;
  onView?: (index: number) => void;
  renderFooter?: (slide: LightboxSlide) => React.ReactNode;
}

export function LightboxEngine({ 
  onClose, 
  onView, 
  renderFooter 
}: LightboxEngineProps) {
  const state = useLightboxStore();

  const handleClose = () => {
    state.close();
    onClose?.();
  };

  const handleView = (index: number) => {
    if (index === state.currentIndex) return;
    state.setCurrentIndex(index);
    onView?.(index);
  };

  if (!state.isOpen) return null;

  return (
    <YARLDriver 
      state={state} 
      onClose={handleClose}
      onView={handleView}
      renderFooter={renderFooter}
    />
  );
}
