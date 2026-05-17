import { useQuery, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { loadAllPhotosFromCloud, loadPhotosByGroupId, getPhotoCount } from '../../services/photoService';
import { QUERY_KEYS } from './keys';

export const usePhotosQuery = (filters: any, page: number, limit: number) => {
  const result = useQuery({
    queryKey: QUERY_KEYS.photos({ ...filters, page, limit }),
    queryFn: () => loadAllPhotosFromCloud(
      undefined, 
      page, 
      limit, 
      filters.categoryId, 
      filters.tagId, 
      filters.searchQuery
    ),
    placeholderData: keepPreviousData,
  });
  return { ...result, data: result.data ?? [] };
};

export const useInfinitePhotosQuery = (filters: any, limit: number = 20) => {
  return useInfiniteQuery({
    queryKey: QUERY_KEYS.infinitePhotos({ ...filters, limit }),
    queryFn: async ({ pageParam = 1 }) => {
      const photos = await loadAllPhotosFromCloud(
        undefined,
        (pageParam as number) - 1, // Service is 0-indexed
        limit,
        filters.categoryId,
        filters.tagId,
        filters.searchQuery
      );
      return {
        photos,
        nextPage: photos.length === limit ? (pageParam as number) + 1 : undefined
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1,
    placeholderData: keepPreviousData,
  });
};

export const usePhotoCountQuery = (filters: any) => {
  return useQuery({
    queryKey: QUERY_KEYS.photoCount(filters),
    queryFn: () => getPhotoCount(filters.categoryId, filters.tagId, filters.searchQuery),
    placeholderData: keepPreviousData,
  });
};

export const useGroupPhotosQuery = (groupId: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.groupPhotos(groupId),
    queryFn: () => loadPhotosByGroupId(groupId),
    enabled: !!groupId,
    placeholderData: keepPreviousData,
  });
};
