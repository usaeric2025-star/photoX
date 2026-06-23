import { usePhotos as useSWRPhotos, PhotoListFilters } from '@/lib/query/hooks/usePhotos';

export type { PhotoListFilters };

/**
 * Hook to get the list of photos using SWR.
 */
export function usePhotos(filters: PhotoListFilters & { mode?: 'admin' | 'public' }) {
  // Pass filters as params
  return useSWRPhotos(filters as Record<string, unknown>);
}
