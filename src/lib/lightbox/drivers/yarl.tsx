import React from 'react';
import Lightbox from 'yet-another-react-lightbox';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Download from 'yet-another-react-lightbox/plugins/download';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';

import type { LightboxState, LightboxSlide } from '../types';
import { LightboxInfoCard } from '@/features/lightbox/components/LightboxInfoCard';

interface YARLDriverProps {
  state: LightboxState;
  onClose: () => void;
  onView?: (index: number) => void;
  renderFooter?: (slide: LightboxSlide) => React.ReactNode;
}

export function YARLDriver({ 
  state, 
  onClose, 
  onView,
  renderFooter
}: YARLDriverProps) {
  const slides = React.useMemo(() => state.slides.map((s) => ({
    src: s.src,
    alt: s.alt,
    title: s.title,
    description: s.description,
    original: s, 
  })), [state.slides]);

  const plugins = [];
  if (state.config.canThumbnails) plugins.push(Thumbnails);
  if (state.config.canZoom) plugins.push(Zoom);
  if (state.config.canDownload) plugins.push(Download);

  return (
    <Lightbox
      open={state.isOpen}
      close={onClose}
      index={state.currentIndex}
      slides={slides}
      plugins={plugins}
      carousel={{ 
        preload: 2,
        imageFit: "contain"
      }}
      on={{
        view: ({ index }) => onView?.(index),
      }}
      styles={{
        root: { "--yarl__color_backdrop": "rgba(0,0,0,0.95)", zIndex: 9999 } as any,
        container: { backgroundColor: 'transparent' } as any,
        slide: { padding: 0 } as any,
      }}
      render={{
        slideFooter: ({ index }) => {
          const originalSlide = state.slides[index];
          return renderFooter ? renderFooter(originalSlide) : null;
        },
      }}
    />
  );
}
