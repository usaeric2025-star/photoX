import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { thumbHashToDataURL } from '../../utils/thumbHash';

// Shared set to keep track of loaded images to prevent flickering on re-renders
export const loadedImagesCache = new Set<string>();

const getBaseUrl = (url?: string): string => {
  if (!url) return '';
  try {
    const u = new URL(url);
    u.searchParams.delete('t');
    return u.toString();
  } catch (e) {
    return url.split(/[?&]t=/)[0];
  }
};

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
  const containerRef = useRef<HTMLDivElement>(null);
  const cacheKey = photoId || src || '';
  
  const isInitiallyLoaded = useMemo(() => {
    return cacheKey ? loadedImagesCache.has(cacheKey) : false;
  }, [cacheKey]);

  const [shouldLoad, setShouldLoad] = useState(isInitiallyLoaded || loading === 'eager');
  const [isImageLoaded, setIsImageLoaded] = useState(isInitiallyLoaded);
  const [isImageError, setIsImageError] = useState(false);

  const [prevKey, setPrevKey] = useState(cacheKey);
  const lastSuccessfulBaseUrlRef = useRef<string>(src ? getBaseUrl(src) : '');

  // Synchronously reset state during render when the item is recycled to a new image
  if (cacheKey !== prevKey) {
    setPrevKey(cacheKey);
    const currentlyCached = cacheKey ? loadedImagesCache.has(cacheKey) : false;
    setIsImageLoaded(currentlyCached);
    setIsImageError(false);
    setShouldLoad(currentlyCached || loading === 'eager');
    lastSuccessfulBaseUrlRef.current = src ? getBaseUrl(src) : '';
  }

  // Handle dynamic source changes smoothly without flashing placeholder when only params like timestamp alter
  useEffect(() => {
    if (!src) return;
    const newCacheKey = photoId || src || '';
    const isCached = loadedImagesCache.has(newCacheKey);
    const newBaseUrl = getBaseUrl(src);

    if (isCached) {
      setIsImageLoaded(true);
      setIsImageError(false);
      setShouldLoad(true);
      lastSuccessfulBaseUrlRef.current = newBaseUrl;
    } else {
      // If the core image URL is matching the already present one, keep it loaded as transition
      if (lastSuccessfulBaseUrlRef.current && lastSuccessfulBaseUrlRef.current === newBaseUrl) {
        setShouldLoad(true);
      } else {
        // Genuine new photo, fall back to blur-hash placeholder to fetch freshly
        setIsImageLoaded(false);
        setIsImageError(false);
        if (loading === 'eager') {
          setShouldLoad(true);
        }
      }
    }
  }, [src, photoId, loading]);

  useEffect(() => {
    if (loading === 'eager' || isInitiallyLoaded) {
      setShouldLoad(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: '400px' }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [loading, isInitiallyLoaded]);

  const placeholderDataUrl = useMemo(() => {
    if (!thumbHash) return null;
    return thumbHashToDataURL(thumbHash);
  }, [thumbHash]);

  return (
    <div 
      ref={containerRef}
      className={`absolute inset-0 w-full h-full select-none overflow-hidden ${className}`}
      onClick={onClick}
    >
      {/* 1. Pulse fallback if neither loaded nor having a thumbhash placeholder */}
      {!isImageError && !placeholderDataUrl && (
        <div 
          className={`absolute inset-0 bg-slate-200 flex items-center justify-center transition-opacity duration-300 ${
            isImageLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100 animate-pulse'
          }`}
        >
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
      {!isImageError && placeholderDataUrl && (
        <img 
          draggable={false}
          src={placeholderDataUrl} 
          alt=""
          className={`absolute inset-0 w-full h-full object-cover pointer-events-none filter blur-sm scale-110 transition-opacity duration-350 ${
            isInitiallyLoaded ? 'opacity-0 pointer-events-none' : isImageLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        />
      )}

      {/* 4. The actual loaded image */}
      {!isImageError && src && shouldLoad && (
        <img 
          draggable={false}
          loading={loading}
          decoding="async"
          referrerPolicy="no-referrer"
          src={src} 
          alt={alt}
          width={400}
          className={`w-full h-full object-cover pointer-events-none transition-opacity duration-300 ${
            isInitiallyLoaded ? 'opacity-100' : isImageLoaded ? 'opacity-100' : 'opacity-0'
          } ${imgClassName}`}
          onLoad={() => {
            if (cacheKey) {
              loadedImagesCache.add(cacheKey);
            }
            setIsImageLoaded(true);
            if (src) {
              lastSuccessfulBaseUrlRef.current = getBaseUrl(src);
            }
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
