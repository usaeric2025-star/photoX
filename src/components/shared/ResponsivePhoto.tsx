import React, { useState, useEffect } from 'react';
import { Photo } from '@/types';
import { thumbHashToDataURL } from '@/services/storage/thumbHash';
import { ContractedImage } from './ContractedImage';
import { ImageOff } from 'lucide-react';
import { getSafeText } from '@/features/ai/safeText';

const loadedSrcCache = new Set<string>();

interface ResponsivePhotoProps {
  photo: Photo;
  variant: 'sm' | 'md';
  aspectRatio: number;
  className?: string;
  imgClassName?: string;
}

export function ResponsivePhoto({ 
  photo, 
  variant, 
  aspectRatio, 
  className = '',
  imgClassName = ''
}: ResponsivePhotoProps) {
  if (!photo) return null;

  const src = variant === 'md' 
    ? (photo.thumbnail_md_url || photo.thumbnail_sm_url || photo.image_url)
    : (photo.thumbnail_sm_url || photo.image_url || photo.uri);

  const [isLoaded, setIsLoaded] = useState(() => src ? loadedSrcCache.has(src) : false);
  const [hasError, setHasError] = useState(false);

  // If src changes, update state
  useEffect(() => {
    if (src && loadedSrcCache.has(src)) {
       setIsLoaded(true);
    } else {
       setIsLoaded(false);
    }
    setHasError(false);
  }, [src]);

  const placeholderDataUrl = (() => {
    if (!photo.thumb_hash) return null;
    try {
      return thumbHashToDataURL(photo.thumb_hash);
    } catch (e) {
      return null;
    }
  })();

  const pb = `${(1 / aspectRatio) * 100}%`;

  return (
    <div 
      className={`relative w-full bg-slate-100 overflow-hidden select-none ${className}`}
      style={{ 
        paddingBottom: pb, 
        height: 0, 
        flexShrink: 0,
        contain: 'layout style paint' 
      }}
    >
      {placeholderDataUrl && !hasError && (
        <div 
          className="absolute inset-0 bg-cover bg-center pointer-events-none filter blur-lg scale-105 transition-opacity duration-300 ease-in-out"
          style={{ 
            backgroundImage: `url(${placeholderDataUrl})`,
            opacity: isLoaded ? 0 : 1,
            willChange: 'opacity'
          }}
        />
      )}

      {hasError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
          <ImageOff size={24} className="text-slate-300" />
        </div>
      ) : (
        src && (
          <ContractedImage
            src={src}
            alt={getSafeText(photo.name) || 'Photo'}
            priority={isLoaded}
            width={variant === 'md' ? [320, 640, 800] : [320, 640]}
            aspectRatio={String(aspectRatio)}
            onLoad={async (e: React.SyntheticEvent<HTMLImageElement>) => {
               if (e.target instanceof HTMLImageElement) {
                  await e.target.decode().catch(() => {});
               }
               if (src) loadedSrcCache.add(src);
               setIsLoaded(true);
            }}
            onError={(e) => {
               if (e.currentTarget.src !== '/fallback-image.jpg') {
                 e.currentTarget.src = '/fallback-image.jpg';
               } else {
                 setHasError(true);
               }
            }}
            className={`${imgClassName} absolute inset-0 w-full h-full transition-opacity duration-200 ease-out`}
            style={{ 
               opacity: isLoaded ? 1 : 0,
               willChange: 'opacity' 
            }}
          />
        )
      )}
    </div>
  );
};

