import React from 'react';
import { Modal } from '#src/components/ui/Modal.js';
import { Icon } from '#src/components/ui/Icon.js';
import { Image } from '#src/components/ui/Image.js';
import { getThumbnailUrl } from '#src/utils/mappers/utils.js';

interface PhotoZoomOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  previewSrc?: string;
  imageHash?: string;
}

/**
 * PhotoZoomOverlay
 * 
 * 照片編輯對話框中的照片放大預覽組件。
 */
export function PhotoZoomOverlay({ isOpen, onClose, previewSrc, imageHash }: PhotoZoomOverlayProps) {
  if (!previewSrc) return null;
  
  return (
    <Modal 
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
          className="absolute top-6 right-6 px-4 py-2 bg-black/60 hover:bg-black/80 border border-white/20 rounded-full text-white transition-all flex items-center gap-2 group shadow-2xl active:scale-95"
        >
          <span className="text-xs font-black uppercase tracking-widest group-hover:text-amber-400 transition-colors">CLOSE</span>
          <Icon name="x" size={20} className="group-hover:text-amber-400 transition-colors" />
        </button>
        
        <Image 
          src={getThumbnailUrl(previewSrc, 800, undefined, imageHash)} 
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300" 
          alt="Zoomed" 
        />
      </div>
    </Modal>
  );
}
