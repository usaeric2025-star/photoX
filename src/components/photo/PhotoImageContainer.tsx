import React, { useState, useMemo } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { thumbHashToDataURL } from '../../utils/thumbHash';

// Shared set to keep track of loaded images to prevent flickering on re-renders
export const loadedImagesCache = new Set<string>();

export interface PhotoImageContainerProps {
  photoId?: string;
  src: string | undefined;
  thumbHash?: string | null;
  alt: string;
  onClick?: (e: React.MouseEvent) => void;
  className?: string; // Styles for the wrapper container
  imgClassName?: string; // Styles for the inner image
  loading?: 'lazy' | 'eager';
}

export const PhotoImageContainer: React.FC<PhotoImageContainerProps> = ({
  photoId,
  src,
  thumbHash,
  alt,
  onClick,
  className = '',
  imgClassName = '',
  loading = 'lazy'
}) => {
  const cacheKey = photoId || src || '';
  const [initiallyLoaded] = useState(() => (cacheKey ? loadedImagesCache.has(cacheKey) : false));
  const [isImageLoaded, setIsImageLoaded] = useState(initiallyLoaded);
  const [isImageError, setIsImageError] = useState(false);

  const placeholderDataUrl = useMemo(() => {
    if (!thumbHash) return null;
    return thumbHashToDataURL(thumbHash);
  }, [thumbHash]);

  return (
    <div 
      className={`absolute inset-0 w-full h-full select-none overflow-hidden ${className}`}
      onClick={onClick}
    >
      {/* 1. Pulse fallback if neither loaded nor having a thumbhash placeholder */}
      {!isImageLoaded && !isImageError && !placeholderDataUrl && (
        <div className="absolute inset-0 bg-slate-200 animate-pulse flex items-center justify-center">
          <ImageIcon className="text-slate-300 w-8 h-8 opacity-20" />
        </div>
      )}

      {/* 2. Image error state */}
      {isImageError && (
        <div className="absolute inset-0 bg-slate-100 flex flex-col items-center justify-center gap-2 p-4 text-center">
          <ImageIcon className="text-slate-300 w-8 h-8 opacity-50" />
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
            Load Failed
          </span>
        </div>
      )}

      {/* 3. Thumbhash blur placeholder */}
      {!isImageError && !isImageLoaded && placeholderDataUrl && (
        <img 
          draggable={false}
          src={placeholderDataUrl} 
          alt=""
          className="absolute inset-0 w-full h-full object-cover pointer-events-none filter blur-sm scale-110"
        />
      )}

      {/* 4. The actual loaded image */}
      {!isImageError && src && (
        <img 
          draggable={false}
          loading={loading}
          referrerPolicy="no-referrer"
          src={src} 
          alt={alt}
          width={400}
          className={`w-full h-full object-cover pointer-events-none transition-opacity duration-300 ${
            initiallyLoaded ? 'opacity-100' : isImageLoaded ? 'opacity-100' : 'opacity-0'
          } ${imgClassName}`}
          onLoad={() => {
            if (cacheKey) {
              loadedImagesCache.add(cacheKey);
            }
            setIsImageLoaded(true);
          }}
          onError={() => {
            setIsImageLoaded(true);
            setIsImageError(true);
          }}
        />
      )}
    </div>
  );
};
