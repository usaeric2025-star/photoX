import { useEffect } from 'react';

export const useScrollRestoration = (key: string = 'window_scroll_pos') => {
  useEffect(() => {
    // Restore scroll position upon component mount
    const saved = sessionStorage.getItem(key);
    if (saved) {
      try {
        const { x, y } = JSON.parse(saved);
        const timer = setTimeout(() => {
          window.scrollTo({
            left: x,
            top: y,
            behavior: 'auto'
          });
        }, 150); // slight delay to allow layout calculation
        return () => clearTimeout(timer);
      } catch (e) {
        console.error('Error restoring scroll position:', e);
      }
    }
  }, [key]);

  useEffect(() => {
    let frameId: number;

    const handleScroll = () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      frameId = requestAnimationFrame(() => {
        try {
          sessionStorage.setItem(
            key,
            JSON.stringify({ x: window.scrollX, y: window.scrollY })
          );
        } catch (e) {
          // sessionStorage quota or unavailable
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [key]);
};
