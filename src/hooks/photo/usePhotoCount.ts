import { createQuery } from '@/lib/query/queryFactory';
import { getPhotoCount } from '@/services/photo/queries/list';
import { queryKeys } from '@/lib/query/keys';

interface PhotoCountFilters {
  category_id?: string | null;
  tag_id?: string | null;
  searchQuery?: string | null;
  isAdminMode?: boolean;
}

/**
 * Hook to get the total count of photos using standard query factory.
 */
export const usePhotoCount = createQuery<number, PhotoCountFilters | undefined>({
  staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  gcTime: 1000 * 60 * 10,  // Keep in cache for 10 minutes
  queryKey: (filters) => {
    const f = filters || {};
    return queryKeys.photos.count({ 
      category: f.category_id ?? undefined,
      tags: f.tag_id ? [f.tag_id] : undefined,
      q: f.searchQuery ?? undefined,
    });
  },
  queryFn: async (filters) => {
    const f = filters || {};
    return await getPhotoCount(f.category_id, f.tag_id, f.searchQuery, f.isAdminMode || false);
  }
});
