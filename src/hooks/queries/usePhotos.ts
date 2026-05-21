import { useQuery, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { loadAllPhotosFromCloud, loadPhotosByGroupId, loadPhotosByGroupIdPaginated, getPhotoCount } from '../../services/photoService';
import { QUERY_KEYS } from './keys';
import { syncCache } from '../../utils/indexedDB';

export const useInfinitePhotos = (filters: { 
  category_id?: string | null; 
  tag_id?: string | null; 
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
        filters.category_id,
        filters.tag_id,
        filters.searchQuery,
        filters.isAdminMode || false,
        signal
      );

      // Cache the first page for offline access safely (don't interfere with main fetch state)
      if (pageParam === 1 && !filters.searchQuery && !filters.category_id && !filters.tag_id) {
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

export const usePhotoCountQuery = (filters: { category_id?: string | null; tag_id?: string | null; searchQuery?: string | null }, isAdminMode: boolean = false) => {
  return useQuery({
    queryKey: QUERY_KEYS.photoCount({ ...filters, isAdminMode }),
    queryFn: () => getPhotoCount(filters.category_id, filters.tag_id, filters.searchQuery, isAdminMode),
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
    refetchOnWindowFocus: false,
  });
};

export const useInfiniteGroupPhotosQuery = (groupId: string | null, isAdminMode: boolean = false, pageSize: number = 20) => {
  return useInfiniteQuery({
    queryKey: ['photos', 'group', 'infinite', groupId, isAdminMode, pageSize],
    queryFn: ({ pageParam = 1 }) => 
      loadPhotosByGroupIdPaginated(groupId!, pageParam, pageSize, isAdminMode),
    enabled: !!groupId,
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.photos.length, 0);
      return loaded < lastPage.total ? allPages.length + 1 : undefined;
    },
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
};
