import { useCallback, useRef, useEffect } from 'react';

export function useDebouncedSearch<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debounced = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
  
  const cancel = useCallback(() => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);
  
  // Attach cancel method to the debounced function
  return Object.assign(debounced, { cancel });
}
