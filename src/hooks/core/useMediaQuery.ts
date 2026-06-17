import { useState, useEffect } from 'react';

/**
 * A highly robust, lightweight Hook to subscribe to system or custom media queries.
 */
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
    const updateMatch = () => {
      setMatches(media.matches);
    };

    // Keep initial state in sync
    updateMatch();

    // Modern browsers support addEventListener, older support addListener
    if (media.addEventListener) {
      media.addEventListener('change', updateMatch);
      return () => media.removeEventListener('change', updateMatch);
    } else {
      // Fallback
      media.addListener(updateMatch);
      return () => media.removeListener(updateMatch);
    }
  }, [query]);

  return matches;
}
