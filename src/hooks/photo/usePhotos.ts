import { createInfiniteQuery } from '@/lib/query/queryFactory';
import { getPhotos as loadAllPhotosFromCloud } from '@/services/photo/queries/list';
import { getPhotosByGroupPaginated as loadPhotosByGroupIdPaginated } from '@/services/photo/queries/byGroup';
import { queryKeys } from '@/lib/query/keys';

import { syncCache } from '@/lib/db/indexedDB';
import { PHOTO_QUERY_CONFIG } from '@/constants/config';
import { useQueryClient, InfiniteData, keepPreviousData } from '@tanstack/react-query';
import { Photo } from '@/types';
import { logger } from '@/lib/logger';

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
  queryKey: (filters) => {
    const q = (filters.searchQuery && filters.searchQuery.trim()) ? filters.searchQuery.trim() : null;
    return queryKeys.photos.infinite({
      category: filters.category_id ?? undefined,
      tags: filters.tag_id ? [filters.tag_id] : undefined,
      q: q ?? undefined,
      sort: filters.sortOrder ?? undefined,
    }, filters.isAdminMode ? 'admin' : 'public');
  },
  queryFn: async (filters, pageParam, signal) => {
    logger.debug('usePhotos queryFn called with filters:', filters);
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
            queryClient.invalidateQueries({ queryKey: queryKeys.photos.count({}) });
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
  placeholderData: keepPreviousData
});

/**
 * Hook for infinite group photo lists.
 */
export const useGroupPhotosResult = createInfiniteQuery<{photos: Photo[], total: number, hasMore: boolean}, { groupId: string | null; isAdminMode: boolean; pageSize: number }, any>({
  queryKey: (vars: { groupId: string | null; isAdminMode: boolean; pageSize: number }) => queryKeys.photos.infinite({ groupId: vars.groupId ?? undefined } as any, vars.isAdminMode ? 'admin' : 'public'),
  queryFn: async ({ groupId, isAdminMode, pageSize }: { groupId: string | null; isAdminMode: boolean; pageSize: number }, pageParam: any) => {
    const data = await loadPhotosByGroupIdPaginated(groupId!, pageParam, pageSize, isAdminMode);
    return {
      photos: data.photos,
      total: data.total,
      hasMore: data.photos.length >= pageSize
    };
  },
  getNextPageParam: (lastPage: any, allPages: any[]) => {
    const loaded = allPages.reduce((sum: number, p: any) => sum + p.photos.length, 0);
    return (loaded < lastPage.total && lastPage.photos.length > 0) ? allPages.length + 1 : undefined;
  },
  select: flattenPhotos,
  staleTime: 2 * 60 * 1000, // Increased to 2 minutes for better snappy feel
  placeholderData: keepPreviousData
} as any);

export const useGroupPhotos = (groupId: string | null, isAdminMode: boolean = false, pageSize: number = 40) => {
  const queryClient = useQueryClient();
  const query = useGroupPhotosResult({ groupId, isAdminMode, pageSize }, {
    enabled: !!groupId
  });

  return {
    ...query,
    photos: query.data?.pages?.flatMap((p: any) => p.photos) ?? [],
    total: query.data?.pages?.[0]?.total || 0
  };
};
