import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { QueryClient } from '@tanstack/react-query';
import { photoKeys, groupKeys } from '@/lib/queryKeys';
import { PHOTO_QUERY_CONFIG } from '@/constants/config';
import { createStaleTime } from '@/shared/freshnessSchema';
import { getGroupById } from '@/services/group/queries';

/**
 * 路由層預加載邏輯
 * 保持 router.tsx 乾淨，所有 Query 邏輯收攏於此
 */

export async function prefetchMainGallery(queryClient: QueryClient) {
  const queryKey = photoKeys.infinite({ 
    category_id: null,
    tag_id: null,
    searchQuery: null,
    sortOrder: null,
    isAdminMode: false,
    onlyUngrouped: false,
    manufacturer_id: null,
    is_hidden: false,
    limit: PHOTO_QUERY_CONFIG.limit
  });

  return queryClient.prefetchInfiniteQuery({
    queryKey,
    queryFn: async () => {
      const { getPhotos } = await import('@/services/photo/queries/list');
      const photos = await getPhotos(
        undefined,
        0,
        PHOTO_QUERY_CONFIG.limit,
        undefined,
        undefined,
        undefined,
        false
      );
      return {
        photos: photos,
        nextPage: photos.length >= PHOTO_QUERY_CONFIG.limit ? 2 : undefined
      };
    },
    initialPageParam: 1,
    staleTime: createStaleTime('REALTIME'),
  });
}

export async function prefetchGroupDetail(queryClient: QueryClient, groupId: string, isAdminMode: boolean = false) {
  if (!groupId) return;
  const queryKey = groupKeys.detail(groupId);
  queryClient.prefetchQuery({
    queryKey,
    queryFn: async () => {
      const result = await getGroupById(groupId);
      return result || null;
    },
    staleTime: createStaleTime('STABLE'),
  });
  
  const photosKey = photoKeys.infinite({
    groupId,
    isAdminMode,
    pageSize: 60
  });
  
  queryClient.prefetchInfiniteQuery({
    queryKey: photosKey,
    queryFn: async ({ pageParam = 1 }) => {
      const { getPhotosByGroupPaginated } = await import('@/services/photo/queries/byGroup');
      const data = await getPhotosByGroupPaginated(
        groupId, pageParam as number, 60, isAdminMode
      );
      const hasMore = Array.isArray(data.photos) ? data.photos.length >= 60 : false;
      return { photos: data.photos, total: data.total, hasMore, nextPage: hasMore ? (pageParam as number) + 1 : undefined };
    },
    initialPageParam: 1,
    staleTime: createStaleTime('STABLE'),
  });
}
