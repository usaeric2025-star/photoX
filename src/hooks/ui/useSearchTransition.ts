import { useTransition, useCallback } from 'react';

/**
 * Hook to handle search transitions using React 19 useTransition.
 * Replaces manual debounce for filter updates to provide smoother UI interaction.
 */
export const useSearchTransition = (onUpdate: (value: string) => void) => {
  const [isPending, startTransition] = useTransition();

  const updateSearch = useCallback((searchTerm: string) => {
    startTransition(() => {
      onUpdate(searchTerm);
    });
  }, [onUpdate]);

  return { isPending, updateSearch };
};
