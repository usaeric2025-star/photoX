import React from 'react';
import Lightbox from 'yet-another-react-lightbox';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Counter from 'yet-another-react-lightbox/plugins/counter';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';
import 'yet-another-react-lightbox/plugins/counter.css';

import type { LightboxState, LightboxSlide } from '../types';
import { LightboxInfoCard } from '@/features/lightbox/components/LightboxInfoCard';

interface YARLDriverProps {
  state: LightboxState;
  onClose: () => void;
  onView?: (index: number) => void;
  renderFooter?: (slide: LightboxSlide) => React.ReactNode;
  renderHeader?: (slide: LightboxSlide) => React.ReactNode;
}

export function YARLDriver({ 
  state, 
  onClose, 
  onView,
  renderFooter,
  renderHeader
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
  
  // 始終啟用 Zoom 用於手勢，但配置隱藏按鈕
  plugins.push(Zoom);
  plugins.push(Counter);

  return (
    <Lightbox
      open={state.isOpen}
      close={onClose}
      index={state.currentIndex}
      slides={slides}
      plugins={plugins}
      zoom={{
        maxZoomLevel: 3,
        scrollToZoom: true,
        wheelZoomDistanceFactor: 100,
        pinchZoomDistanceFactor: 100,
      }}
      thumbnails={{
        width: 48,
        height: 48,
        gap: 6,
        padding: 4,
        borderRadius: 4,
        imageFit: 'cover',
      }}
      counter={{ container: { style: { top: 0, left: 0 } } }}
      carousel={{ 
        preload: 2,
        imageFit: "contain",
        padding: "80px 16px 140px 16px"
      }}
      on={{
        view: ({ index }) => onView?.(index),
      }}
      styles={{
        root: { "--yarl__color_backdrop": "rgba(0,0,0,0.92)", zIndex: 9999 } as any,
        container: { 
          backgroundColor: 'rgba(0,0,0,0.92)',
          backdropFilter: 'blur(8px)',
        } as any,
        slide: { paddingTop: '80px', paddingBottom: '120px' } as any,
        header: { padding: '8px 12px' } as any,
      }}
      toolbar={{ buttons: ['close'] }}
      render={{
        buttonZoom: () => null,
        iconZoomIn: () => null,
        iconZoomOut: () => null,
        controls: () => {
          const slide = slides[state.currentIndex]?.original;
          if (!slide) return null;
          return (
            <div className="absolute inset-0 pointer-events-none z-50 flex flex-col justify-between">
              {renderHeader && (
                <div className="pointer-events-auto absolute top-0 right-16 p-3">
                  {renderHeader(slide)}
                </div>
              )}
              {renderFooter && (
                <div className="pointer-events-auto absolute bottom-0 left-0 right-0 p-4 flex justify-center">
                  {renderFooter(slide)}
                </div>
              )}
            </div>
          );
        }
      }}
    />
  );
}
