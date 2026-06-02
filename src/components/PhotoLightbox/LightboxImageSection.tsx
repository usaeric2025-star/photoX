import React, { useMemo, useState, useEffect } from 'react';
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import { X, Maximize, ChevronLeft, ChevronRight, Download, Edit3, Image as ImageIcon } from 'lucide-react';
import { Photo, TranslationType } from '../../types';
import { getCacheBustedImageUrl } from '../../lib/ui-helpers';
import { thumbHashToDataURL } from '@/lib/image/thumbHash';

interface LightboxImageSectionProps {
  photo: Photo;
  index: number;
  isZoomed: boolean;
  setIsZoomed: (v: boolean) => void;
  isImageLoading: boolean;
  setIsImageLoading: (v: boolean) => void;
  isImageError: boolean;
  setIsImageError: (v: boolean) => void;
  slides: { src: string }[];
  totalCount?: number;
  onPrev: (e?: React.MouseEvent) => void;
  onNext: (e?: React.MouseEvent) => void;
  onClose: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  onEditPhoto?: (photo: Photo) => void;
  handleDownload: () => void;
  t: TranslationType;
  retryImageLoad: () => void;
  isAdminMode?: boolean;
}

export function LightboxImageSection({
  photo, index, isZoomed, setIsZoomed, isImageLoading, setIsImageLoading,
  isImageError, setIsImageError, slides, totalCount, onPrev, onNext, onClose,
  onTouchStart, onTouchMove, onTouchEnd, onEditPhoto,
  handleDownload, t, retryImageLoad, isAdminMode
}: LightboxImageSectionProps) {
  if (!photo) {
    return (
      <div className={`relative ${isZoomed ? 'flex-1' : 'flex-none md:flex-1'} bg-black flex items-center justify-center h-[42vh] md:h-full`}>
        <div className="w-12 h-12 border-4 border-slate-700 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  const placeholderDataUrl = photo.thumb_hash ? thumbHashToDataURL(photo.thumb_hash) : null;

  const initialSrc = getCacheBustedImageUrl(photo, 'image');
  const [currentSrc, setCurrentSrc] = useState(initialSrc);
  const [hasFallbackTried, setHasFallbackTried] = useState(false);

  useEffect(() => {
    setCurrentSrc(getCacheBustedImageUrl(photo, 'image'));
    setHasFallbackTried(false);
  }, [photo.id, photo.image_url]);

  return (
    <div 
      className={`relative ${isZoomed ? 'flex-1' : 'flex-none md:flex-1'} bg-black flex items-center justify-center h-[42vh] md:h-full`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        <button 
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsZoomed(true);
          }} 
          className="w-10 h-10 bg-black/20 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-black/40 transition-all"
          title="缩放"
        >
          <Maximize size={20} />
        </button>
        <button onClick={onClose} className="w-10 h-10 bg-black/20 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-black/40 transition-all">
          <X size={20} />
        </button>
      </div>

      <div className="absolute inset-0 z-0">
        <img 
          src={placeholderDataUrl || getCacheBustedImageUrl(photo, 'thumb')} 
          className={`w-full h-full object-contain ${placeholderDataUrl ? '' : 'blur-xl'} opacity-30 transition-opacity duration-1000 ${isImageLoading ? 'opacity-30' : 'opacity-0'}`}
          aria-hidden="true"
          loading="lazy"
        />
      </div>

      {isImageLoading && !isImageError && (
        <div className="absolute inset-0 animate-shimmer flex flex-col items-center justify-center z-20">
           <div className="w-12 h-12 border-4 border-brand-navy/10 border-t-brand-navy rounded-full animate-spin mb-4 shadow-xl opacity-20"></div>
        </div>
      )}

      {isImageError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-black/60 text-white gap-4">
           <ImageIcon className="w-16 h-16 opacity-30" />
           <p className="text-sm font-black uppercase tracking-widest opacity-50">{t.imageLoadFailed}</p>
           <button 
             onClick={retryImageLoad}
             className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-xs font-black uppercase tracking-widest transition-all"
           >
             Retry
           </button>
        </div>
      )}

      <div className={`relative w-full h-full flex items-center justify-center overflow-hidden`}>
        {isZoomed ? (
          <Lightbox
            open={isZoomed}
            close={() => setIsZoomed(false)}
            slides={slides}
            index={index || 0}
            plugins={[Zoom]}
            controller={{ closeOnBackdropClick: true }}
            on={{
              view: ({ index: newIndex }) => {
                // Prevent loops: only trigger parent update if index effectively changed 
                // and it's not the same as the current prop index
                if (typeof newIndex === 'number' && newIndex !== index) {
                  if (newIndex > (index || 0)) onNext();
                  else if (newIndex < (index || 0)) onPrev();
                }
              }
            }}
          />
        ) : (
            <img 
              key={photo.id}
              referrerPolicy="no-referrer"
              decoding="async"
              src={currentSrc}
              alt={photo.name || 'Photo'}
              className={`absolute inset-0 z-10 object-contain h-full w-full cursor-pointer transition-all duration-700 ease-out ${isImageLoading ? 'opacity-0 scale-105 blur-lg' : 'opacity-100 scale-100 blur-0'}`} 
              onLoad={() => setIsImageLoading(false)}
              onError={() => {
                if (!hasFallbackTried) {
                  setHasFallbackTried(true);
                  const fallback = getCacheBustedImageUrl(photo, 'thumb');
                  if (fallback && fallback !== currentSrc) {
                    setCurrentSrc(fallback);
                    return;
                  }
                }
                setIsImageLoading(false);
                setIsImageError(true);
              }}
              onClick={() => setIsZoomed(true)} 
            />
        )}
      </div>

      <div className="absolute bottom-4 left-4 z-20 flex items-center justify-start group cursor-pointer" onClick={onPrev}>
        <div className="w-10 h-10 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all">
          <ChevronLeft size={24} />
        </div>
      </div>
      
      {/* 底部正中间照片计数 */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center bg-black/40 hover:bg-black/60 backdrop-blur-md px-4 h-10 rounded-full text-white text-xs sm:text-sm font-semibold tracking-wider select-none transition-all">
        {index + 1} / {totalCount || slides.length}
      </div>
      
      {isAdminMode && (
        <div className="absolute bottom-4 right-16 z-20 flex items-center justify-end group cursor-pointer" onClick={handleDownload}>
          <div className="w-10 h-10 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all">
            <Download size={24} />
          </div>
        </div>
      )}

      <div className="absolute bottom-4 right-4 z-20 flex items-center justify-end group cursor-pointer" onClick={onNext}>
        <div className="flex w-10 h-10 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full items-center justify-center text-white transition-all ml-auto">
          <ChevronRight size={24} />
        </div>
      </div>
    </div>
  );
};
