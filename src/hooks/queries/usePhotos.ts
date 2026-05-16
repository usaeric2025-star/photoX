import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
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
  });
  return { ...result, data: result.data ?? [] };
};

export const useInfinitePhotosQuery = (filters: any, limit: number = 20) => {
  return useInfiniteQuery({
    queryKey: QUERY_KEYS.infinitePhotos({ ...filters, limit }),
    queryFn: ({ pageParam = 0 }) => loadAllPhotosFromCloud(
      undefined,
      pageParam as number,
      limit,
      filters.categoryId,
      filters.tagId,
      filters.searchQuery
    ),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === limit ? allPages.length : undefined;
    },
    initialPageParam: 0,
  });
};

export const usePhotoCountQuery = (filters: any) => {
  return useQuery({
    queryKey: QUERY_KEYS.photoCount(filters),
    queryFn: () => getPhotoCount(filters.categoryId, filters.tagId, filters.searchQuery),
  });
};

export const useGroupPhotosQuery = (groupId: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.groupPhotos(groupId),
    queryFn: () => loadPhotosByGroupId(groupId),
    enabled: !!groupId,
  });
};
