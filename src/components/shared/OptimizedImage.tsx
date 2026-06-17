import React from 'react';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  eager?: boolean; // true: LCP/首屏可見圖片；false(默認): Virtua控制
  className?: string;
}

export const OptimizedImage = ({ 
  src, 
  alt, 
  eager = false, 
  className = '', 
  ...props 
}: OptimizedImageProps) => {
  if (!src || src.trim() === '') return null;
  return (
    <picture>
      <source srcSet={src.includes('?') ? `${src}&format=avif` : `${src}?format=avif`} type="image/avif" />
      <source srcSet={src.includes('?') ? `${src}&format=webp` : `${src}?format=webp`} type="image/webp" />
      <img 
        src={src} 
        alt={alt} 
        decoding="async"
        fetchPriority={eager ? 'high' : 'low'}
        loading={eager ? 'eager' : undefined}
        className={className}
        {...props} 
      />
    </picture>
  );
};
