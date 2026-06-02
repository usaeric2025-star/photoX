import { createStaleTime } from '@/shared/freshnessSchema';
import { useQuery } from '@tanstack/react-query';
import { getPhotoCount, getLocalPhotoCount } from '@/services/photo/queries';
import { photoKeys } from '@/lib/queryKeys';

interface PhotoCountFilters {
  category_id?: string | null;
  tag_id?: string | null;
  searchQuery?: string | null;
  isAdminMode?: boolean;
  source?: 'server' | 'local';
}

/**
 * Hook to get the total count of photos based on filters and source.
 */
export const usePhotoCount = (
  filters: PhotoCountFilters = {},
  isAdminModeArg: boolean = false
) => {
  const source = filters.source || 'server';
  const isAdminMode = filters.isAdminMode ?? isAdminModeArg;
  
  return useQuery({
    queryKey: [...photoKeys.count({ 
      category_id: filters.category_id ?? null,
      tag_id: filters.tag_id ?? null,
      searchQuery: filters.searchQuery ?? null,
      isAdminMode 
    }), source],
    queryFn: () => {
      if (source === 'local') {
        return getLocalPhotoCount();
      }
      return getPhotoCount(filters.category_id, filters.tag_id, filters.searchQuery, isAdminMode);
    },
    staleTime: source === 'local' ? 5000 : createStaleTime('STABLE'),
    refetchOnMount: true,
  });
};
