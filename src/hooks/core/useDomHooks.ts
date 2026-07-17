import { useState, useEffect, useRef, useCallback } from 'react';
import { showToast } from '#lib/ui/toast.js';
import { copyToClipboard } from '#src/utils/clipboard.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { useTranslation } from './useTranslation.js';

// --- Media Query Hook ---
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia(query);
    const updateMatch = () => setMatches(media.matches);
    
    updateMatch();
    
    if (media.addEventListener) {
      media.addEventListener('change', updateMatch);
      return () => media.removeEventListener('change', updateMatch);
    } else {
      media.addListener(updateMatch);
      return () => media.removeListener(updateMatch);
    }
  }, [query]);

  return matches;
}

// --- Click Outside Hook ---
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  handler: () => void,
  events: string[] = ['mousedown', 'touchstart'],
  nodes?: (HTMLElement | null)[]
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const listener = (event: Event) => {
      const { target } = event;
      if (!target || (ref.current && ref.current.contains(target as Node))) return;
      if (nodes && !nodes.every((node) => node && !node.contains(target as Node))) return;
      handler();
    };

    events.forEach((fn) => document.addEventListener(fn, listener));
    return () => events.forEach((fn) => document.removeEventListener(fn, listener));
  }, [handler, events, nodes]);

  return ref;
}

// --- Copy To Clipboard Hook ---
interface UseCopyToClipboardOptions {
  timeout?: number;
  showToast?: boolean;
  successMessage?: string;
  errorMessage?: string;
  onCopy?: (text: string) => void;
}

export const useCopyToClipboard = (options?: UseCopyToClipboardOptions) => {
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation();

  const copy = useCallback(
    async (text: string) => {
      const success = await copyToClipboard(text, options);
      if (success) {
        setCopied(true);
        if (options?.showToast !== false) {
          showToast.success(options?.successMessage || t('copySuccess'));
        }
        options?.onCopy?.(text);
        setTimeout(() => setCopied(false), 2000);
      } else {
        ErrorFactory.handle(options?.errorMessage || t('copyFailed'), { context: 'clipboard-op' });
      }
    },
    [options, t]
  );

  return { copy, copied };
};

// --- Long Press Hook ---
interface UseLongPressOptions {
  delay?: number;
  onLongPress: (e: React.MouseEvent | React.TouchEvent) => void;
  onClick?: (e: React.MouseEvent | React.TouchEvent) => void;
  disabled?: boolean;
}

export function useLongPress<T extends HTMLElement = HTMLDivElement>({
  delay = 800,
  onLongPress,
  onClick,
  disabled = false,
}: UseLongPressOptions) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const isPressedRef = useRef(false);
  const elementRef = useRef<T | null>(null);
  const startCoordsRef = useRef<{ x: number; y: number } | null>(null);
  const lastTouchTimeRef = useRef<number>(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    const isTouchEvent = 'touches' in e;
    const now = Date.now();
    
    if (!isTouchEvent && now - lastTouchTimeRef.current < 500) return;
    if (isTouchEvent) lastTouchTimeRef.current = now;
    
    let clientX = isTouchEvent ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    let clientY = isTouchEvent ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    startCoordsRef.current = { x: clientX, y: clientY };
    isPressedRef.current = true;
    isLongPressRef.current = false;
    
    timerRef.current = setTimeout(() => {
      if (isPressedRef.current) {
        isLongPressRef.current = true;
        onLongPress(e);
      }
      clearTimer();
    }, delay);
  }, [disabled, delay, onLongPress, clearTimer]);

  const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (disabled || !isPressedRef.current || !startCoordsRef.current) return;
    
    let clientX = 'touches' in e ? (e.touches[0]?.clientX || 0) : (e as React.MouseEvent).clientX;
    let clientY = 'touches' in e ? (e.touches[0]?.clientY || 0) : (e as React.MouseEvent).clientY;
    
    const diffX = clientX - startCoordsRef.current.x;
    const diffY = clientY - startCoordsRef.current.y;
    
    if (Math.sqrt(diffX * diffX + diffY * diffY) > 20) {
      isPressedRef.current = false;
      clearTimer();
    }
  }, [disabled, clearTimer]);

  const handleEnd = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    clearTimer();
    if (isPressedRef.current && !isLongPressRef.current && onClick) {
      onClick(e);
    }
    isPressedRef.current = false;
    startCoordsRef.current = null;
  }, [disabled, clearTimer, onClick]);

  const handleLeave = useCallback(() => {
    clearTimer();
    isPressedRef.current = false;
    startCoordsRef.current = null;
  }, [clearTimer]);

  return {
    onMouseDown: handleStart, 
    onMouseMove: handleMove, 
    onMouseUp: handleEnd, 
    onMouseLeave: handleLeave,
    onTouchStart: handleStart, 
    onTouchMove: handleMove, 
    onTouchEnd: handleEnd, 
    onTouchCancel: handleLeave,
    ref: elementRef,
  };
}
