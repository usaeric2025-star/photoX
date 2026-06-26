import { useEffect, useRef } from 'react';

/**
 * Custom hook to detect clicks outside of an element
 * Replaces Mantine's useClickOutside
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  handler: () => void,
  events: string[] = ['mousedown', 'touchstart'],
  nodes?: (HTMLElement | null)[]
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const listener = (event: Event) => {
      const { target } = event;
      if (!target) return;

      // Check if target is inside the ref element
      if (ref.current && ref.current.contains(target as Node)) {
        return;
      }

      // Check if target is inside the additional nodes
      if (nodes) {
        const isOutsideNodes = nodes.every((node) => node && !node.contains(target as Node));
        if (!isOutsideNodes) return;
      }

      handler();
    };

    events.forEach((fn) => document.addEventListener(fn, listener));

    return () => {
      events.forEach((fn) => document.removeEventListener(fn, listener));
    };
  }, [handler, events, nodes]);

  return ref;
}
