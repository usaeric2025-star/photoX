import React from 'react';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  eager?: boolean; // true: LCP/首屏可見圖片；false(默認): Virtua控制
  className?: string;
  srcSet?: string;
  sizes?: string;
}

export const OptimizedImage = ({ 
  src, 
  alt, 
  eager = false, 
  className = '', 
  srcSet,
  sizes,
  ...props 
}: OptimizedImageProps) => {
  return (
    <img
      src={src}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      decoding="async"
      fetchPriority={eager ? 'high' : 'low'}
      loading={eager ? 'eager' : undefined}
      className={className}
      {...props}
    />
  );
};
