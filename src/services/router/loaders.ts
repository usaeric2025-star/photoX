import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { QueryClient } from '@tanstack/react-query';
import { photoKeys, groupKeys } from '@/lib/queryKeys';
import { PHOTO_QUERY_CONFIG } from '@/lib/photoQueryConfig';
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
    limit: PHOTO_QUERY_CONFIG.limit
  }, 'REALTIME');

  return queryClient.prefetchInfiniteQuery({
    queryKey,
    queryFn: async () => {
      const { loadAllPhotosFromCloud } = await import('@/services/photo');
      const res = await loadAllPhotosFromCloud(
        undefined,
        0,
        PHOTO_QUERY_CONFIG.limit,
        undefined,
        undefined,
        undefined,
        false
      );
      if (!res.ok) throw ErrorFactory.wrap(new Error(res.message), 'loaders');
      const photos = res.data || [];
      return {
        photos: photos,
        nextPage: photos.length >= PHOTO_QUERY_CONFIG.limit ? 2 : undefined
      };
    },
    initialPageParam: 1,
    staleTime: createStaleTime('REALTIME'),
  });
}

export async function prefetchGroupDetail(queryClient: QueryClient, groupId: string) {
  if (!groupId) return;
  const queryKey = groupKeys.detail(groupId, 'STABLE');
  return queryClient.prefetchQuery({
    queryKey,
    queryFn: () => getGroupById(groupId),
    staleTime: createStaleTime('STABLE'),
  });
}
