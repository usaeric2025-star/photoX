import { useRef, useCallback } from 'react';

/**
 * 預加載通用 Hook
 * 具備 80ms 防抖與懸浮/觸控雙通道支持
 */
export function usePrefetch(prefetchFn: () => void, delayMs = 80) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prefetchedRef = useRef(false);

  const startPrefetch = useCallback(() => {
    if (prefetchedRef.current) return;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      prefetchFn();
      prefetchedRef.current = true;
    }, delayMs);
  }, [prefetchFn, delayMs]);

  const cancelPrefetch = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return {
    onMouseEnter: startPrefetch,
    onMouseLeave: cancelPrefetch,
    onTouchStart: startPrefetch,
    onTouchEnd: cancelPrefetch,
    onTouchCancel: cancelPrefetch,
  };
}
