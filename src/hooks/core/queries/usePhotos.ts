import { createStaleTime } from '@/shared/freshnessSchema';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { loadAllPhotosFromCloud, loadPhotosByGroupIdPaginated } from '@/services/photo/queries';
import { photoKeys } from '@/lib/queryKeys';
import { syncCache } from '@/lib/db/indexedDB';
import { PAGINATION } from '@/constants/config';

/**
 * Hook for infinite photo lists (main grid).
 * Plural naming following PhotoX conventions.
 */
export const usePhotos = (filters: { 
  category_id?: string | null; 
  tag_id?: string | null; 
  searchQuery?: string | null; 
  sortOrder?: 'asc' | 'desc' | string | null;
  isAdminMode?: boolean;
  onlyUngrouped?: boolean;
}, limit: number = PAGINATION.PUBLIC_PAGE_SIZE, enabled: boolean = true) => {
  return useInfiniteQuery({
    queryKey: photoKeys.infinite({ 
      category_id: filters.category_id ?? null,
      tag_id: filters.tag_id ?? null,
      searchQuery: filters.searchQuery ?? null,
      sortOrder: filters.sortOrder ?? null,
      isAdminMode: filters.isAdminMode ?? false,
      onlyUngrouped: filters.onlyUngrouped ?? false, 
      limit 
    }),
    queryFn: async ({ pageParam = 1, signal }) => {
      const pageSize = limit;

      const photos = await loadAllPhotosFromCloud(
        undefined,
        (pageParam as number) - 1,
        pageSize,
        filters.category_id,
        filters.tag_id,
        filters.searchQuery,
        filters.isAdminMode || false,
        signal,
        filters.sortOrder,
        filters.onlyUngrouped || false
      );

      if (pageParam === 1 && !filters.searchQuery && !filters.category_id && !filters.tag_id) {
        syncCache.savePhotos(photos).catch(() => {});
      }

      return {
        photos: photos || [],
        nextPage: (photos || []).length >= pageSize ? (pageParam as number) + 1 : undefined
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1,
    enabled,
    staleTime: 30 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
};

/**
 * Hook for infinite group photo lists.
 */
export const useGroupPhotos = (groupId: string | null, isAdminMode: boolean = false, pageSize: number = 60) => {
  const queryClient = useQueryClient();

  return useInfiniteQuery({
    queryKey: photoKeys.infinite({ groupId, isAdminMode, pageSize }),
    queryFn: async ({ pageParam = 1 }) => {
      const res = await loadPhotosByGroupIdPaginated(groupId!, pageParam, pageSize, isAdminMode);
      return {
        photos: res.photos,
        total: res.total,
        hasMore: res.photos.length >= pageSize
      };
    },
    enabled: !!groupId,
    placeholderData: () => {
      if (!groupId) return undefined;
      const allQueries = queryClient.getQueriesData<any>({ queryKey: photoKeys.all });
      const dict = new Map();
      allQueries.forEach(([_k, data]) => {
        if (data?.pages) {
          data.pages.forEach((p: any) => {
            if (p.photos) {
              p.photos.forEach((photo: any) => {
                if (photo.group_id === groupId) {
                  dict.set(photo.id, photo);
                }
              });
            }
          });
        }
      });
      const cached = Array.from(dict.values());
      if (cached.length > 0) {
        return {
          pages: [{ photos: cached, total: cached.length, hasMore: false }],
          pageParams: [1]
        };
      }
      return undefined;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.photos.length, 0);
      return (loaded < lastPage.total && lastPage.photos.length > 0) ? allPages.length + 1 : undefined;
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 30 * 1000,
  });
};
