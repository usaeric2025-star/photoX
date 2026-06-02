import { queryClient } from '@/lib/queryClient';
import { groupKeys } from '@/lib/queryKeys';
import { useGroupPhotos } from '@/hooks';
import { cleanPhotos } from '@/lib/filters';
import { useMemo } from 'react';

export function useGroupView(activeGroupId: string | null) {
  const groupPhotosQuery = useGroupPhotos(activeGroupId, true);
  
  const groupPhotos = useMemo(
    () => cleanPhotos(groupPhotosQuery.data?.pages.flatMap(p => p.photos) || []),
    [groupPhotosQuery.data]
  );

  return {
    groupPhotos,
    isLoading: groupPhotosQuery.isLoading,
    refetch: () => queryClient.invalidateQueries({ queryKey: groupKeys.all }),
  };
}
