import { queryClient } from '@/lib/queryClient';
import { groupKeys } from '@/lib/queryKeys';
import { usePhotoList } from '@/hooks';
import { cleanPhotos } from '@/lib/filters';
import { useMemo } from 'react';

export function useGroupView(activeGroupId: string | null) {
  const groupPhotosQuery = usePhotoList(activeGroupId || '', true);
  
  const groupPhotos = useMemo(
    () => cleanPhotos(groupPhotosQuery.data || []),
    [groupPhotosQuery.data]
  );

  return {
    groupPhotos,
    isLoading: groupPhotosQuery.isLoading,
    refetch: () => queryClient.invalidateQueries({ queryKey: groupKeys.list() }),
  };
}
