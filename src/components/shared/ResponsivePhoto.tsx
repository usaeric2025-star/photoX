import React, { useMemo } from 'react';
import { Photo } from '@/types';
import { thumbHashToDataURL } from '@/lib/image/thumbHash';
import { ContractedImage } from './ContractedImage';

interface ResponsivePhotoProps {
  photo: Photo;
  variant: 'sm' | 'md';
  aspectRatio: number;
  className?: string;
  imgClassName?: string;
}

export const ResponsivePhoto: React.FC<ResponsivePhotoProps> = ({ 
  photo, 
  variant, 
  aspectRatio, 
  className = '',
  imgClassName = ''
}) => {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const src = variant === 'md' 
    ? (photo.thumbnail_md_url || photo.thumbnail_sm_url || photo.image_url)
    : (photo.thumbnail_sm_url || photo.image_url || photo.uri);

  const placeholderDataUrl = useMemo(() => {
    if (!photo.thumb_hash) return null;
    try {
      return thumbHashToDataURL(photo.thumb_hash);
    } catch (e) {
      return null;
    }
  }, [photo.thumb_hash]);

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
      {placeholderDataUrl && (
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center pointer-events-none filter blur-lg scale-105 transition-opacity duration-500 ease-in-out"
          style={{ 
            backgroundImage: `url(${placeholderDataUrl})`,
            opacity: isLoaded ? 0 : 1,
            willChange: 'opacity'
          }}
        />
      )}
      {src && (
        <ContractedImage
          src={src}
          alt={photo.name || 'Photo'}
          width={variant === 'md' ? [320, 640, 800] : [320, 640]}
          aspectRatio={String(aspectRatio)}

          onLoad={async (e: any) => {
             if (e.target instanceof HTMLImageElement) {
                await e.target.decode().catch(() => {});
             }
             setIsLoaded(true);
          }}
          className={`${imgClassName} absolute inset-0 z-10 w-full h-full transition-opacity duration-300 ease-out`}
          style={{ 
             opacity: isLoaded ? 1 : 0,
             willChange: 'opacity' 
          }}
        />
      )}
    </div>
  );
};

