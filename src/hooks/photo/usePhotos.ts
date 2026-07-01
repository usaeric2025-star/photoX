import { usePhotos as useSWRPhotos, PhotoListFilters } from '@/lib/query/hooks/usePhotos';
import { useFilters } from '@/features/filters/useFilters';
import { useAppQuery } from '@/lib/query';
import { api } from '@/lib/api';

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

/**
 * Hook to get the absolute total count of all photos in the system.
 * This remains constant across pagination and filters.
 */
export function usePhotosCount() {
  const { data, isLoading, error, mutate } = useAppQuery(
    'photos/count',
    async () => {
      const res = await api.photos.count.$get();
      if (!res.ok) throw new Error('Failed to fetch photo count');
      const json = await res.json();
      if (!json.success) throw new Error('Failed to fetch photo count');
      return json.data as number;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 1 minute
    }
  );

  return {
    count: data ?? 0,
    isLoading,
    error,
    mutate
  };
}

