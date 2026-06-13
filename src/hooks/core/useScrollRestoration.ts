import { useEffect, useRef } from 'react';

export function useScrollRestoration(
  restoreKey: string | undefined,
  dataLength: number,
  onRestore: (offset: number) => void
) {
  const isScrollRestoredRef = useRef(false);
  const scrollTimeoutRef = useRef<number | null>(null);

  // Reset when key changes
  useEffect(() => {
    isScrollRestoredRef.current = false;
  }, [restoreKey]);

  // Offset restoration
  useEffect(() => {
    if (restoreKey && dataLength > 0 && !isScrollRestoredRef.current) {
      const saved = sessionStorage.getItem(restoreKey);
      if (saved) {
        try {
          const offset = parseFloat(saved);
          if (!isNaN(offset) && offset > 0) {
            isScrollRestoredRef.current = true;
            // timeout allows virtualizer to measure container
            setTimeout(() => onRestore(offset), 10);
            return;
          }
        } catch (e) {}
      }
      // If no saved offset, default to top (0)
      isScrollRestoredRef.current = true;
      onRestore(0);
    }
  }, [restoreKey, dataLength, onRestore]);

  const recordScroll = (offset: number) => {
    if (!restoreKey) return;
    
    if (scrollTimeoutRef.current) {
      window.clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = window.setTimeout(() => {
      try {
        sessionStorage.setItem(restoreKey, offset.toString());
      } catch (e) {
        // ignore sessionStorage full/quota
      }
    }, 100);
  };

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return { recordScroll };
}
