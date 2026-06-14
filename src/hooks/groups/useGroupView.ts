import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/lib/query/keys';
import { useGroupPhotos } from '@/hooks';
import { cleanPhotos } from '@/services/photo/processing';

/**
 * useGroupView
 * 管理合組詳情頁的照片數據與刷新邏輯。
 */
export function useGroupView(activeGroupId: string | null) {
  const groupPhotosQuery = useGroupPhotos(activeGroupId, true);
  
  const groupPhotos = cleanPhotos(groupPhotosQuery.data?.pages.flatMap((p: any) => p.photos) || []);

  return {
    groupPhotos,
    isLoading: groupPhotosQuery.isLoading,
    refetch: () => queryClient.invalidateQueries({ queryKey: queryKeys.groups.all }),
  };
}
