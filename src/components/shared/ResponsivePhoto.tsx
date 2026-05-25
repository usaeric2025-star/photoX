import React, { useMemo } from 'react';
import { Photo } from '@/types';
import { thumbHashToDataURL } from '../../utils/thumbHash';

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
  const src = variant === 'md' 
    ? (photo.thumbnail_md_url || photo.thumbnail_sm_url || photo.image_url)
    : (photo.thumbnail_sm_url || photo.image_url);

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
      style={{ paddingBottom: pb, height: 0, flexShrink: 0 }}
    >
      {placeholderDataUrl && (
        <div 
          className="absolute inset-0 bg-cover bg-center pointer-events-none filter blur-sm scale-110"
          style={{ backgroundImage: `url(${placeholderDataUrl})` }}
        />
      )}
      {src && (
        <img
          src={src}
          alt={photo.name || 'Photo'}
          className={`absolute inset-0 w-full h-full object-cover pointer-events-none ${imgClassName}`}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          loading="eager"
          decoding="async"
        />
      )}
    </div>
  );
};

