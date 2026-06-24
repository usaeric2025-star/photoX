import { useCallback, useEffect, useRef } from 'react';

/**
 * Custom hook for debouncing callbacks
 * Replaces Mantine's useDebouncedCallback
 */
export function useDebouncedCallback<P extends unknown[], R>(
  callback: (...args: P) => R,
  delay: number
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef<(...args: P) => R>(callback);

  // Update callback ref to point to the latest callback function
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedFn = (...args: P) => {
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

  return debouncedFn as ((...args: P) => void) & { cancel: () => void };
}
