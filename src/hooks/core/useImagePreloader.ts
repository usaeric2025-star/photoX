import { useRef, useCallback } from 'react';

// 全局缓存，避免重复预加载同一张图片
const preloadedUrls = new Set<string>();

export const useImagePreloader = () => {
  const preloadTimerRef = useRef<NodeJS.Timeout | null>(null);

  const preloadImage = useCallback((url: string) => {
    if (!url || preloadedUrls.has(url)) return;
    preloadedUrls.add(url);
    const img = new Image();
    img.src = url;
  }, []);

  const preloadBatch = useCallback((urls: (string | undefined | null)[]) => {
    // 延迟预加载，避免阻塞主线程
    if (preloadTimerRef.current) clearTimeout(preloadTimerRef.current);
    preloadTimerRef.current = setTimeout(() => {
      urls.forEach(url => {
        if (url) preloadImage(url);
      });
    }, 200);
  }, [preloadImage]);

  return { preloadImage, preloadBatch };
};
