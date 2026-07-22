import { useRef, useCallback, useEffect } from 'react';

/**
 * useTopLayer
 * 
 * 管理原生 Top Layer 元素 (dialog/popover) 的 Hook。
 */
export function useTopLayer() {
  const ref = useRef<any>(null);

  const show = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    
    try {
      if (el.showPopover) {
        el.showPopover();
      } else if (el.showModal) {
        el.showModal();
      }
    } catch (e) {
      console.warn('TopLayer show failed', e);
    }
  }, []);

  const hide = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    
    try {
      if (el.hidePopover) {
        el.hidePopover();
      } else if (el.close) {
        el.close();
      }
    } catch (e) {
      // Ignore
    }
  }, []);

  return { ref, show, hide };
}
