import { useRef, useEffect } from 'react';

interface UseLongPressOptions {
  delay?: number;
  onLongPress: (e?: any) => void;
}

export function useLongPress(
  ref: React.RefObject<HTMLElement | null>,
  { onLongPress, delay = 600 }: UseLongPressOptions
) {
  const timerRef = useRef<number | null>(null);
  const isLongPress = useRef(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  
  const callbackRef = useRef(onLongPress);

  useEffect(() => {
    callbackRef.current = onLongPress;
  }, [onLongPress]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const clearTimer = () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const handleStart = (e: PointerEvent | TouchEvent) => {
      // Ignore right clicks or multi-touch
      if ('button' in e && e.button !== 0) return;
      if ('touches' in e && e.touches.length > 1) return;
      
      clearTimer();
      isLongPress.current = false;
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as PointerEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as PointerEvent).clientY;
      startPos.current = { x: clientX, y: clientY };

      timerRef.current = window.setTimeout(() => {
        isLongPress.current = true;
        callbackRef.current?.(e);
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try { navigator.vibrate(50); } catch (err) {}
        }
      }, delay);
    };

    const handleMove = (e: PointerEvent | TouchEvent) => {
      if (!startPos.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as PointerEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as PointerEvent).clientY;
      const dx = clientX - startPos.current.x;
      const dy = clientY - startPos.current.y;
      if (Math.abs(dx) > 15 || Math.abs(dy) > 15) {
        clearTimer();
      }
    };

    const handleEnd = (e: PointerEvent | TouchEvent) => {
      clearTimer();
      if (isLongPress.current) {
        if (e.cancelable) e.preventDefault();
        
        // Add a one-time capture listener to swallow the following click
        const swallowClick = (clickEvent: MouseEvent) => {
          clickEvent.stopImmediatePropagation();
          clickEvent.preventDefault();
          el.removeEventListener('click', swallowClick, true);
        };
        el.addEventListener('click', swallowClick, true);
        
        // Safety timeout to remove the listener if no click fires
        setTimeout(() => {
          el.removeEventListener('click', swallowClick, true);
        }, 300);
      }
    };

    const handleContextMenu = (e: Event) => {
      e.preventDefault();
    };

    // We use pointer events as the primary source for modern reliability
    // They handle both touch and mouse consistently
    el.addEventListener('pointerdown', handleStart as any);
    el.addEventListener('pointermove', handleMove as any);
    el.addEventListener('pointerup', handleEnd as any);
    el.addEventListener('pointercancel', handleEnd as any);
    el.addEventListener('contextmenu', handleContextMenu);

    return () => {
      clearTimer();
      el.removeEventListener('pointerdown', handleStart as any);
      el.removeEventListener('pointermove', handleMove as any);
      el.removeEventListener('pointerup', handleEnd as any);
      el.removeEventListener('pointercancel', handleEnd as any);
      el.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [ref, delay]);
}
