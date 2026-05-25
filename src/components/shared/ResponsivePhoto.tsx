import React from 'react';
import { Photo } from '@/types';

interface ResponsivePhotoProps {
  photo: Photo;
  variant: 'sm' | 'md';
  className?: string;
}

export const ResponsivePhoto: React.FC<ResponsivePhotoProps> = ({ photo, variant, className }) => {
  const src = variant === 'md' 
    ? (photo.thumbnail_md_url || photo.thumbnail_sm_url || photo.image_url)
    : (photo.thumbnail_sm_url || photo.image_url);

  return (
    <img
      src={src}
      alt={photo.name}
      className={className}
      loading="lazy"
      decoding="async"
      width={variant === 'md' ? 800 : 300}
      height={variant === 'md' ? 300 : 300}
      onError={(e) => {
        if (e.currentTarget.src !== photo.image_url) {
          e.currentTarget.src = photo.image_url;
        }
      }}
    />
  );
};
