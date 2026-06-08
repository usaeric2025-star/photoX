import { createQuery } from './core/queryFactory';
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
 * Hook to get the total count of photos using standard query factory.
 */
export const usePhotoCount = createQuery<number, PhotoCountFilters | undefined>({
  queryKey: (filters) => {
    const f = filters || {};
    return [...photoKeys.count({ 
      category_id: f.category_id ?? null,
      tag_id: f.tag_id ?? null,
      searchQuery: f.searchQuery ?? null,
      isAdminMode: f.isAdminMode ?? false
    }), f.source || 'server'];
  },
  queryFn: async (filters) => {
    const f = filters || {};
    const res = await (f.source === 'local' 
      ? getLocalPhotoCount() 
      : getPhotoCount(f.category_id, f.tag_id, f.searchQuery, f.isAdminMode || false));
    
    if (!res.ok) throw new Error(res.message);
    return res.data;
  }
});
