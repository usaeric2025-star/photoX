import { useEffect } from 'react';

/**
 * @hook-contract {
 *   "inputs": { "key": "string" },
 *   "outputs": "void",
 *   "invariants": [
 *     "每次 key 變化時重置並恢復對應捲動位置"
 *   ],
 *   "forbidden": ["禁止直接修改全局 state"],
 *   "ai_maintenance_rule": "修改此 Hook 前必須先讀取並更新 @hook-contract"
 * }
 */
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
    // @deps-contract: static=[key] dynamic=[]
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
    // @deps-contract: static=[key] dynamic=[]
  }, [key]);
};
