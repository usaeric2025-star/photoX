import { createInfiniteQuery } from '@/lib/query/queryFactory';
import { getPhotos as loadAllPhotosFromCloud } from '@/services/photo/queries/list';
import { getPhotosByGroupPaginated as loadPhotosByGroupIdPaginated } from '@/services/photo/queries/byGroup';
import { photoKeys } from '@/lib/queryKeys';
import { syncCache } from '@/lib/db/indexedDB';
import { PHOTO_QUERY_CONFIG } from '@/constants/config';
import { useQueryClient, InfiniteData } from '@tanstack/react-query';
import { Photo } from '@/types';

interface PhotoFilters {
  category_id?: string | null;
  tag_id?: string | null;
  searchQuery?: string | null;
  sortOrder?: 'asc' | 'desc' | string | null;
  isAdminMode?: boolean;
  onlyUngrouped?: boolean;
  manufacturer_id?: string | null;
  is_hidden?: boolean | null;
  limit?: number;
}

/**
 * Standard flattening selector for photos
 */
const flattenPhotos = (data: InfiniteData<any>) => {
  const photos = data.pages.flatMap((page) => page.photos || []) as Photo[];
  return {
    ...data,
    photos
  };
};

/**
 * Hook for infinite photo lists (main grid).
 */
export const usePhotos = createInfiniteQuery<{photos: Photo[], nextPage?: number}, PhotoFilters, any>({
  queryKey: (filters) => photoKeys.infinite({
    category_id: filters.category_id ?? null,
    tag_id: filters.tag_id ?? null,
    searchQuery: filters.searchQuery ?? null,
    sortOrder: filters.sortOrder ?? null,
    isAdminMode: filters.isAdminMode ?? false,
    onlyUngrouped: filters.onlyUngrouped ?? false,
    manufacturer_id: filters.manufacturer_id ?? null,
    is_hidden: filters.is_hidden ?? undefined,
    limit: filters.limit ?? PHOTO_QUERY_CONFIG.limit
  }),
  queryFn: async (filters, pageParam, signal) => {
    const limit = filters.limit ?? PHOTO_QUERY_CONFIG.limit;
    const res = await loadAllPhotosFromCloud(
      undefined,
      pageParam - 1,
      limit,
      filters.category_id,
      filters.tag_id,
      filters.searchQuery,
      filters.isAdminMode || false,
      signal,
      filters.sortOrder,
      filters.onlyUngrouped || false,
      filters.manufacturer_id,
      filters.is_hidden
    );

    const photos = (res || []).map(p => {
      // Inject _time here so it's calculated ONLY ONCE per fetch
      // and won't be repeated in the select selector for thousands of items
      if (!(p as any)._time) {
        (p as any)._time = p.created_at_timestamp || new Date(p.created_at || (p as any).created_at || 0).getTime();
      }
      return p;
    });

    if (pageParam === 1 && !filters.searchQuery && !filters.category_id && !filters.tag_id) {
      syncCache.savePhotos(photos)
        .then(() => {
          import('@/lib/queryClient').then(({ queryClient }) => {
            queryClient.invalidateQueries({ queryKey: ['photos', 'count'] });
          }).catch(() => {});
        })
        .catch(() => {});
    }

    return {
      photos,
      nextPage: photos.length >= limit ? pageParam + 1 : undefined
    };
  },
  getNextPageParam: (lastPage) => lastPage.nextPage,
  select: flattenPhotos,
  staleTime: 5 * 60 * 1000,
});

/**
 * Hook for infinite group photo lists.
 */
export const useGroupPhotosResult = createInfiniteQuery<{photos: Photo[], total: number, hasMore: boolean}, { groupId: string | null; isAdminMode: boolean; pageSize: number }, any>({
  queryKey: (vars) => photoKeys.infinite(vars),
  queryFn: async ({ groupId, isAdminMode, pageSize }, pageParam) => {
    const data = await loadPhotosByGroupIdPaginated(groupId!, pageParam, pageSize, isAdminMode);
    return {
      photos: data.photos,
      total: data.total,
      hasMore: data.photos.length >= pageSize
    };
  },
  getNextPageParam: (lastPage, allPages) => {
    const loaded = allPages.reduce((sum, p) => sum + p.photos.length, 0);
    return (loaded < lastPage.total && lastPage.photos.length > 0) ? allPages.length + 1 : undefined;
  },
  select: flattenPhotos,
  staleTime: 30 * 1000,
});

export const useGroupPhotos = (groupId: string | null, isAdminMode: boolean = false, pageSize: number = 60) => {
  const queryClient = useQueryClient();
  const query = useGroupPhotosResult({ groupId, isAdminMode, pageSize }, {
    enabled: !!groupId,
    placeholderData: (prev: any) => {
        if (prev) return prev;
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
            pageParams: [1],
            photos: cached
          };
        }
        return undefined;
      }
  });

  return {
    ...query,
    photos: query.data?.photos ?? []
  };
};
