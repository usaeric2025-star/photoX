import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import { PHOTO_QUERY_CONFIG } from '@/constants/config';
import { createStaleTime } from '@/shared/freshnessSchema';
import { getGroupById } from '@/services/group/queries';
import { loadCategoriesFromCloud } from '@/services/category/queries';
import { loadTagsFromCloud } from '@/services/tag/queries';
import { api } from '@/lib/api';

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

  return Promise.all([
    queryClient.prefetchInfiniteQuery({
      queryKey,
      queryFn: async () => {
        const response = await api.photos.list.$post({
          json: {
            limit: PHOTO_QUERY_CONFIG.limit,
            isAdminMode: false
          }
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        return {
          items: result.data.photos,
          nextCursor: result.data.cursor
        };
      },
      initialPageParam: null,
      staleTime: createStaleTime('REALTIME'),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.categories.categories(),
      queryFn: () => loadCategoriesFromCloud(),
      staleTime: createStaleTime('STABLE'),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.tags.tags(),
      queryFn: () => loadTagsFromCloud(),
      staleTime: createStaleTime('STABLE'),
    })
  ]);
}

export async function prefetchGroupDetail(queryClient: QueryClient, groupId: string, isAdminMode: boolean = false) {
  if (!groupId) return;
  const isQueryAdmin = !!isAdminMode;
  const queryKey = [...queryKeys.groups.detail(groupId, isQueryAdmin)];
  
  return Promise.all([
    queryClient.prefetchQuery({
      queryKey,
      queryFn: async () => {
        const result = await getGroupById(groupId, isQueryAdmin ? 'admin' : 'public');
        return result || null;
      },
      staleTime: createStaleTime('STABLE'),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.categories.categories(),
      queryFn: () => loadCategoriesFromCloud(),
      staleTime: createStaleTime('STABLE'),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.tags.tags(),
      queryFn: () => loadTagsFromCloud(),
      staleTime: createStaleTime('STABLE'),
    }),
    queryClient.prefetchInfiniteQuery({
      queryKey: queryKeys.photos.infinite({ groupId } as unknown as Record<string, unknown>, isAdminMode ? 'admin' : 'public'),
      queryFn: async ({ pageParam = null }) => {
        const response = await api.photos.list.$post({
          json: {
            cursor: pageParam as string | null,
            limit: 40,
            isAdminMode: !!isAdminMode,
            groupId: groupId,
            onlyGroupsCover: false, 
          }
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        return { 
          items: result.data.photos, 
          nextCursor: result.data.cursor 
        };
      },
      initialPageParam: null,
      staleTime: createStaleTime('STABLE'),
    })
  ]);
}
