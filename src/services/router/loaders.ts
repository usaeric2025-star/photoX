import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import { PHOTO_QUERY_CONFIG } from '@/constants/config';
import { createStaleTime } from '@/shared/freshnessSchema';
import { getGroupById } from '@/services/group/queries';
import { getPhotos } from '@/services/photo/queries/list';
import { getPhotosByGroupPaginated } from '@/services/photo/queries/byGroup';

/**
 * 路由層預加載邏輯
 * 保持 router.tsx 乾淨，所有 Query 邏輯收攏於此
 */

export async function prefetchMainGallery(queryClient: QueryClient) {
  const queryKey = queryKeys.photos.infinite({ 
    category: undefined,
    tags: undefined,
    q: undefined,
    sort: undefined
  }, 'public');

  return queryClient.prefetchInfiniteQuery({
    queryKey,
    queryFn: async () => {
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
  const isQueryAdmin = !!isAdminMode;
  const queryKey = [...queryKeys.groups.detail(groupId, isQueryAdmin)];
  queryClient.prefetchQuery({
    queryKey,
    queryFn: async () => {
      const result = await getGroupById(groupId, isQueryAdmin ? 'admin' : 'public');
      return result || null;
    },
    staleTime: createStaleTime('STABLE'),
  });
  
  const photosKey = queryKeys.photos.infinite({ groupId } as any, isAdminMode ? 'admin' : 'public');
  
  queryClient.prefetchInfiniteQuery({
    queryKey: photosKey,
    queryFn: async ({ pageParam = 1 }) => {
      const data = await getPhotosByGroupPaginated(
        groupId, pageParam as number, 40, isAdminMode
      );
      const hasMore = Array.isArray(data.photos) ? data.photos.length >= 40 : false;
      return { photos: data.photos, total: data.total, hasMore, nextPage: hasMore ? (pageParam as number) + 1 : undefined };
    },
    initialPageParam: 1,
    staleTime: createStaleTime('STABLE'),
  });
}
