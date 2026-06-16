import { useGroupDetail } from '@/hooks/groups/useGroupDetail';
import { useGroupPhotos } from '@/hooks/photo/usePhotos';

interface UseGroupDataOptions {
  groupId: string | null;
  isAdmin: boolean;
}

export function useGroupData({ groupId, isAdmin }: UseGroupDataOptions) {
  const { 
    data: group, 
    isPending: isGroupPending, 
    error: groupError 
  } = useGroupDetail({ groupId, isAdmin });

  const {
    photos,
    total,
    isPending: isPhotosPending,
    error: photosError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useGroupPhotos(groupId, isAdmin, 100);

  const loading = isGroupPending || isPhotosPending;
  const error = (groupError || photosError) ? ((groupError as Error)?.message || (photosError as Error)?.message || '載入失敗') : null;

  return {
    group,
    photos,
    totalCount: total,
    loading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  };
}
