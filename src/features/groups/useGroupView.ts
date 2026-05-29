import { useGroupPhotos } from '@/hooks/queries/usePhotos';
import { cleanPhotos } from '@/lib/filters';
import { useMemo } from 'react';

export function useGroupView(activeGroupId: string | null) {
  const groupPhotosQuery = useGroupPhotos(activeGroupId || '', true);
  
  const groupPhotos = useMemo(
    () => cleanPhotos(groupPhotosQuery.data || []),
    [groupPhotosQuery.data]
  );

  return {
    groupPhotos,
    isLoading: groupPhotosQuery.isLoading,
    refetch: () => groupPhotosQuery.refetch(),
  };
}
