import React from 'react';
import { resolveImageUrl } from '../../lib/image-url';

interface Props {
  src: string;
  alt: string;
  width: number | number[]; // Can be a single width or array of widths for srcset
  aspectRatio?: string;
  priority?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

export function ContractedImage({ 
  src, alt, width, aspectRatio = '1/1', priority = false, className = '', style, onLoad, onError
}: Props) {
   const widths = Array.isArray(width) ? width : [width];
   
   const getSrcSet = (format?: 'avif' | 'webp') => {
     return widths.map(w => `${resolveImageUrl(src, { width: w, format })} ${w}w`).join(', ');
   };

  const avifSrcSet = getSrcSet('avif');
   const webpSrcSet = getSrcSet('webp');
   const fallbackSrc = src ? resolveImageUrl(src, { width: widths[0] }) : '/placeholder-image.webp';

   return (
     <picture className={className} style={style}>
       <source type="image/avif" srcSet={avifSrcSet} />
       <source type="image/webp" srcSet={webpSrcSet} />
       <img 
         src={fallbackSrc}
         alt={alt || 'Product Image'}
         loading={priority ? "eager" : "lazy"}
         fetchPriority={priority ? "high" : "low"}
         decoding="async"
         onLoad={onLoad}
         onError={onError}
         style={{ aspectRatio }}
         className="w-full h-full object-cover"
       />
     </picture>
   );
};
