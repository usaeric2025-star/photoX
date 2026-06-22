import Lightbox from 'yet-another-react-lightbox';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Download from 'yet-another-react-lightbox/plugins/download';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';
import React, { useMemo } from 'react';

import { useLightboxStore, type LightboxImage } from '@/store/useLightboxStore';
import { LightboxInfoCard } from './components/LightboxInfoCard';

export interface PhotoLightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: LightboxImage[];
  currentIndex?: number;
  onIndexChange?: (index: number) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onSetCover?: (id: string) => void;
}

export function PhotoLightbox(props: Partial<PhotoLightboxProps>) {
  const store = useLightboxStore();
  const { isOpen, images, currentIndex, close, goTo } = {
    isOpen: props.open ?? store.isOpen,
    images: props.images ?? store.images,
    currentIndex: props.currentIndex ?? store.currentIndex,
    close: () => { props.onOpenChange?.(false); store.close(); },
    goTo: (idx: number) => { props.onIndexChange?.(idx); store.goTo(idx); }
  };

  // ✅ Memoize slides so the array reference is strictly stable across index navigation,
  // completely preventing the infinite update/re-rendering loop in yet-another-react-lightbox.
  const slides = useMemo(() => {
    return images.map(img => ({
      ...img,
      src: img.src,
      alt: img.alt,
      title: img.title,
      category: img.category,
      metadata: img.metadata,
    }));
  }, [images]);
  
  return (
    <Lightbox
      open={isOpen}
      close={close}
      index={currentIndex}
      // ✅ Guard index update to prevent redundant state setter cycles
      on={{ 
        view: ({ index }) => {
          if (index !== currentIndex) {
            goTo(index);
          }
        } 
      }}
      slides={slides as any}
      plugins={[Thumbnails, Zoom, Download]}
      thumbnails={{
        position: 'bottom',
        width: 80,
        height: 80,
        border: 2,
        borderRadius: 8,
        padding: 4,
        gap: 8,
      }}
      carousel={{
        preload: 2,
      }}
      portal={{ root: document.body }}
      controller={{ focus: true }}
      styles={{
        root: { "--yarl__color_backdrop": "rgba(0, 0, 0, 0.95)", zIndex: 2000 } as any,
      }}
      render={{
        // ✅ Standard render custom slideFooter for high quality info panel
        slideFooter: ({ slide }) => (
          <LightboxInfoCard 
            image={slide as any} 
            onEdit={props.onEdit}
            onDelete={props.onDelete}
            onSetCover={props.onSetCover}
          />
        ),
        iconClose: () => (
          <button className="p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition">
            ✕
          </button>
        ),
      }}
    />
  );
}
