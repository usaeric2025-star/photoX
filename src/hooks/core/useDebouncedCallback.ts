import { useCallback, useEffect, useRef } from 'react';

/**
 * Custom hook for debouncing callbacks
 * Replaces Mantine's useDebouncedCallback
 */
export function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef<T>(callback);

  // Update callback ref to point to the latest callback function
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedFn = (...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  };
  (debouncedFn as unknown as { cancel: () => void }).cancel = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedFn as T & { cancel: () => void };
}
