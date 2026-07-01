import { usePhotos as useSWRPhotos, PhotoListFilters } from '#lib/query/hooks/usePhotos.js';
import { useFilters } from '#src/features/filters/useFilters.js';

export type { PhotoListFilters };

/**
 * Hook to get the list of photos using SWR and URL state.
 */
export function usePhotos(options: PhotoListFilters & { mode?: 'admin' | 'public' } = {}) {
  const { queryKey } = useFilters({ 
    enableStatus: options.mode === 'admin',
    enableBatch: options.mode === 'admin'
  });

  // Merge URL params with manual options (manual options override URL params if provided)
  const filters = {
    ...queryKey,
    ...options
  };

  return useSWRPhotos(filters as Record<string, unknown>);
}

