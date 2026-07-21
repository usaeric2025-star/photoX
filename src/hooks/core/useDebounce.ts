import { useRef, useEffect, useCallback, useState } from 'react';

/**
 * 防抖值（用于搜索框输入）
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

/**
 * 防抖函数（用于自动保存、事件回调）
 */
export function useDebounceFn<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): {
  run: (...args: Parameters<T>) => void;
  cancel: () => void;
  isPending: boolean;
} {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPending, setIsPending] = useState(false);
  const fnRef = useRef(fn);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  const run = useCallback(
    (...args: Parameters<T>) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      } else {
        setIsPending(true);
      }
      timerRef.current = setTimeout(() => {
        fnRef.current(...args);
        setIsPending(false);
        timerRef.current = null;
      }, delay);
    },
    [delay]
  );

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      setIsPending(false);
    }
  }, []);

  useEffect(() => cancel, [cancel]);

  return { run, cancel, isPending };
}
