import { usePhotos as useSWRPhotos, PhotoListFilters, prefetchPhotos } from '@/lib/query/hooks/usePhotos';
import { useFilters } from '@/features/filters/useFilters';

export type { PhotoListFilters };
;

/**
 * Hook to get the list of photos using SWR.
 */
export function usePhotos(options: PhotoListFilters & { mode?: 'admin' | 'public' } = {}) {
  const { queryKey } = useFilters({ 
    enableStatus: options.mode === 'admin',
    enableBatch: options.mode === 'admin'
  });

  // Ensure mode is included if provided manually or derived
  const filters = {
    ...queryKey,
    ...options
  };

  return useSWRPhotos(filters as Record<string, unknown>);
}
