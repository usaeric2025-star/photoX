import { useEffect, useRef, useCallback } from 'react';

export function useClickAway<T extends HTMLElement>(
  ref: React.RefObject<T>,
  callback: () => void
) {
  useEffect(() => {
    const handleClick = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        callback();
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [ref, callback]);
}

export function useDebounceFn<T extends (...args: any[]) => any>(
  callback: T,
  options: { wait: number }
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const run = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, options.wait);
    },
    [callback, options.wait]
  );

  const cancel = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  return { run, cancel };
}
