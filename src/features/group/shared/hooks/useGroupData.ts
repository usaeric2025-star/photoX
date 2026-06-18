import { useGroupDetail } from '@/hooks/groups/useGroupDetail';
import { usePhotos } from '@/hooks/photo/usePhotos';

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
    data,
    isPending: isPhotosPending,
    error: photosError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = usePhotos({
    groupId: groupId || undefined,
    mode: isAdmin ? 'admin' : 'public',
  });

  const photos = data?.pages.flatMap(p => p.items) || [];
  const totalCount = data?.pages[0]?.total || 0;

  const loading = isGroupPending || isPhotosPending;
  const error = (groupError || photosError) ? ((groupError as Error)?.message || (photosError as Error)?.message || '載入失敗') : null;

  return {
    group,
    photos,
    totalCount,
    loading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  };
}
