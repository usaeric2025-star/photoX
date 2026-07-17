import React from 'react';
import { Icon } from '#src/components/ui/Icon.js';
import { Image } from '#src/components/ui/Image.js';
import { getThumbnailUrl } from '#src/utils/mappers/utils.js';

interface PhotoPreviewSectionProps {
  previewSrc?: string;
  imageHash?: string;
  onZoom: () => void;
}

/**
 * PhotoPreviewSection
 * 
 * 照片編輯對話框中的照片預覽區域。
 */
export function PhotoPreviewSection({ previewSrc, imageHash, onZoom }: PhotoPreviewSectionProps) {
  if (!previewSrc) return null;
  
  return (
    <div className="w-1/3 shrink-0 space-y-2">
      <div 
        className="aspect-square rounded-2xl overflow-hidden bg-slate-900 shadow-lg border-2 border-white relative group cursor-zoom-in"
        onClick={onZoom}
      >
        <Image 
          src={getThumbnailUrl(previewSrc, 120, 120, imageHash)} 
          className="w-full h-full object-contain" 
          alt="Preview" 
        />
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Icon name="maximize-2" className="text-white drop-shadow-md" size={20} />
        </div>
      </div>
    </div>
  );
}
