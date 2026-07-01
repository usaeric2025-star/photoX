import { usePhotos as useSWRPhotos, PhotoListFilters } from '@/lib/query/hooks/usePhotos';
import { useFilters } from '@/features/filters/useFilters';

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

