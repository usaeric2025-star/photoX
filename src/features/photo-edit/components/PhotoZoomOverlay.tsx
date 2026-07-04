import React from 'react';
import { NativeDialog } from '#src/components/ui/NativeDialog.js';
import { Icon } from '#src/components/ui/Icon.js';
import { Image } from '#src/components/ui/Image.js';
import { getThumbnailUrl } from '#src/services/mappers/utils.js';

interface PhotoZoomOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  previewSrc?: string;
  imageHash?: string;
}

export function PhotoZoomOverlay({ isOpen, onClose, previewSrc, imageHash }: PhotoZoomOverlayProps) {
  if (!previewSrc) return null;

  return (
    <NativeDialog 
      id="photo-zoom-dialog" 
      open={isOpen && !!previewSrc} 
      onClose={onClose} 
      size="screen" 
      hidePadding={true} 
      showCloseButton={false}
    >
      <div className="relative w-full h-full flex items-center justify-center p-4 lg:p-12 bg-black/90 animate-in fade-in duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
        >
          <Icon name="x" size={24} />
        </button>
        <Image 
          src={getThumbnailUrl(previewSrc, 800, undefined, imageHash)} 
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300" 
          alt="Zoomed" 
        />
      </div>
    </NativeDialog>
  );
}
