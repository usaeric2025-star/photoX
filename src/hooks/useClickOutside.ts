import { useEffect, useRef } from 'react';

export const useClickOutside = <T extends HTMLElement>(
  enabled: boolean,
  callback: () => void
) => {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!enabled) return;
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
  }, [enabled, callback]);
  return ref;
};
