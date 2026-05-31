import { createStaleTime } from '@/shared/freshnessSchema';
import { useQuery } from '@tanstack/react-query';
import { getPhotoCount } from '@/services/photo/queries';
import { photoKeys } from '@/lib/queryKeys';

/**
 * Hook to get the total count of photos based on filters.
 */
export const usePhotoCount = (
  filters: { category_id?: string | null; tag_id?: string | null; searchQuery?: string | null }, 
  isAdminMode: boolean = false
) => {
  return useQuery({
    queryKey: photoKeys.count({ 
      category_id: filters.category_id ?? null,
      tag_id: filters.tag_id ?? null,
      searchQuery: filters.searchQuery ?? null,
      isAdminMode 
    }),
    queryFn: () => getPhotoCount(filters.category_id, filters.tag_id, filters.searchQuery, isAdminMode),
    staleTime: createStaleTime('REALTIME'),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};
