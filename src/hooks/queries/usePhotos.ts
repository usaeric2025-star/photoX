import { useQuery, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { loadAllPhotosFromCloud, loadPhotosByGroupId, getPhotoCount } from '../../services/photoService';
import { QUERY_KEYS } from './keys';

export const useInfinitePhotosQuery = (filters: { categoryId?: string | null; tagId?: string | null; searchQuery?: string | null; isAdminMode?: boolean }, limit: number = 20) => {
  return useInfiniteQuery({
    queryKey: QUERY_KEYS.infinitePhotos({ ...filters, limit }),
    queryFn: async ({ pageParam = 1 }) => {
      const photos = await loadAllPhotosFromCloud(
        undefined,
        (pageParam as number) - 1, // Service is 0-indexed
        limit,
        filters.categoryId,
        filters.tagId,
        filters.searchQuery,
        filters.isAdminMode || false
      );
      return {
        photos,
        nextPage: photos.length === limit ? (pageParam as number) + 1 : undefined
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1,
    staleTime: 1000 * 60 * 10, // 10 minutes
    placeholderData: keepPreviousData,
  });
};

export const usePhotoCountQuery = (filters: { categoryId?: string | null; tagId?: string | null; searchQuery?: string | null }, isAdminMode: boolean = false) => {
  return useQuery({
    queryKey: QUERY_KEYS.photoCount({ ...filters, isAdminMode }),
    queryFn: () => getPhotoCount(filters.categoryId, filters.tagId, filters.searchQuery, isAdminMode),
    placeholderData: keepPreviousData,
  });
};

export const useGroupPhotosQuery = (groupId: string, isAdminMode: boolean = false) => {
  return useQuery({
    queryKey: ['photos', 'group', groupId, isAdminMode],
    queryFn: () => loadPhotosByGroupId(groupId, isAdminMode),
    enabled: !!groupId,
    placeholderData: keepPreviousData,
  });
};
