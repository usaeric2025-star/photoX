import { createStaleTime } from '@/shared/freshnessSchema';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { loadAllPhotosFromCloud, loadPhotosByGroupId, loadPhotosByGroupIdPaginated, getPhotoCount } from '../../services/photos';
import { photoKeys } from '../../lib/queryKeys';
import { syncCache } from '../../utils/indexedDB';

import { PAGINATION } from '@/constants/config';

export const useInfinitePhotos = (filters: { 
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
        (pageParam as number) - 1, // Service is 0-indexed
        pageSize,
        filters.category_id,
        filters.tag_id,
        filters.searchQuery,
        filters.isAdminMode || false,
        signal,
        filters.sortOrder,
        filters.onlyUngrouped || false
      );

      // Cache the first page for offline access safely (don't interfere with main fetch state)
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
    staleTime: createStaleTime('REALTIME'), // 1 分钟
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
};

export const usePhotoCount = (filters: { category_id?: string | null; tag_id?: string | null; searchQuery?: string | null }, isAdminMode: boolean = false) => {
  return useQuery({
    queryKey: photoKeys.count({ 
      category_id: filters.category_id ?? null,
      tag_id: filters.tag_id ?? null,
      searchQuery: filters.searchQuery ?? null,
      isAdminMode 
    }),
    queryFn: () => getPhotoCount(filters.category_id, filters.tag_id, filters.searchQuery, isAdminMode),
    staleTime: createStaleTime('REALTIME'), // 1 分钟
  });
};

export const useGroupPhotos = (groupId: string, isAdminMode: boolean = false) => {
  return useQuery({
    queryKey: photoKeys.group(groupId),
    queryFn: () => loadPhotosByGroupId(groupId, isAdminMode),
    enabled: !!groupId,
    select: (data) => data ?? [],
  });
};

export const useInfiniteGroupPhotosQuery = (groupId: string | null, isAdminMode: boolean = false, pageSize: number = 60) => {

  return useInfiniteQuery({
    queryKey: photoKeys.infinite({ groupId, isAdminMode, pageSize }),
    queryFn: ({ pageParam = 1 }) => 
      loadPhotosByGroupIdPaginated(groupId!, pageParam, pageSize, isAdminMode),
    enabled: !!groupId,
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.photos.length, 0);
      return (loaded < lastPage.total && lastPage.photos.length > 0) ? allPages.length + 1 : undefined;
    },
  });
};
