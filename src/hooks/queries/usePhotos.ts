import { useQuery, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { loadAllPhotosFromCloud, loadPhotosByGroupId, getPhotoCount } from '../../services/photoService';
import { QUERY_KEYS } from './keys';
import { syncCache } from '../../utils/indexedDB';

export const useInfinitePhotos = (filters: { 
  categoryId?: string | null; 
  tagId?: string | null; 
  searchQuery?: string | null; 
  sortOrder?: 'asc' | 'desc' | string | null;
  isAdminMode?: boolean 
}, limit: number = 20) => {
  return useInfiniteQuery({
    queryKey: QUERY_KEYS.infinitePhotos({ ...filters, limit }),
    queryFn: async ({ pageParam = 1, signal }) => {
      const photos = await loadAllPhotosFromCloud(
        undefined,
        (pageParam as number) - 1, // Service is 0-indexed
        limit,
        filters.categoryId,
        filters.tagId,
        filters.searchQuery,
        filters.isAdminMode || false,
        signal
      );

      // Cache the first page for offline access safely (don't interfere with main fetch state)
      if (pageParam === 1 && !filters.searchQuery && !filters.categoryId && !filters.tagId) {
        syncCache.savePhotos(photos).catch(() => {});
      }

      return {
        photos: photos || [],
        nextPage: (photos || []).length === limit ? (pageParam as number) + 1 : undefined
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
};

export const usePhotoCountQuery = (filters: { categoryId?: string | null; tagId?: string | null; searchQuery?: string | null }, isAdminMode: boolean = false) => {
  return useQuery({
    queryKey: QUERY_KEYS.photoCount({ ...filters, isAdminMode }),
    queryFn: () => getPhotoCount(filters.categoryId, filters.tagId, filters.searchQuery, isAdminMode),
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
};

export const useGroupPhotosQuery = (groupId: string, isAdminMode: boolean = false) => {
  return useQuery({
    queryKey: ['photos', 'group', groupId, isAdminMode],
    queryFn: () => loadPhotosByGroupId(groupId, isAdminMode),
    enabled: !!groupId,
    placeholderData: keepPreviousData,
    select: (data) => data ?? [],
  });
};
