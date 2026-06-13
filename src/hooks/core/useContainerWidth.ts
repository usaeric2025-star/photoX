import { useState, useEffect, useRef } from 'react';

export function useContainerWidth<T extends HTMLElement>() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const containerRef = useRef<T>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    let timeoutId: number | null = null;
    
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        const newWidth = entries[0].contentRect.width;
        if (timeoutId !== null) window.clearTimeout(timeoutId);
        
        timeoutId = window.setTimeout(() => {
          setWidth(newWidth);
        }, 100);
      }
    });
    
    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, []);

  return { containerRef, width };
}
