import { queryClient } from '@/lib/queryClient';
import { groupKeys } from '@/lib/queryKeys';
import { useGroupPhotos } from '@/hooks';
import { cleanPhotos } from '@/services/photo/processing';
import { useMemo } from 'react';

/**
 * useGroupView
 * 管理合組詳情頁的照片數據與刷新邏輯。
 */
export function useGroupView(activeGroupId: string | null) {
  const groupPhotosQuery = useGroupPhotos(activeGroupId, true);
  
  const groupPhotos = useMemo(
    () => cleanPhotos(groupPhotosQuery.data?.pages.flatMap((p: any) => p.photos) || []),
    [groupPhotosQuery.data]
  );

  return {
    groupPhotos,
    isLoading: groupPhotosQuery.isLoading,
    refetch: () => queryClient.invalidateQueries({ queryKey: groupKeys.all }),
  };
}
