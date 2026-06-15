import { useState } from 'react';

interface LightboxImageProps {
  src: string;
  alt: string;
  loading?: 'lazy' | 'eager';
  className?: string;
}

export function LightboxImage({ src, alt, loading = 'lazy', className = '' }: LightboxImageProps) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (error) {
    return (
      <div className="flex items-center justify-center text-white/50 text-sm h-full w-full">
        ⚠️ 圖片載入失敗
      </div>
    );
  }

  return (
    <>
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        loading={loading}
        className={`${className} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </>
  );
}
