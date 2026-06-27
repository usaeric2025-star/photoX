import { useGroupDetail } from '@/hooks/groups/useGroupDetail';
import { usePhotos } from '@/hooks/photo/usePhotos';
import { useFilters } from '@/features/filters';

interface UseGroupDataOptions {
  groupId: string | null;
  isAdmin: boolean;
}

export function useGroupData({ groupId, isAdmin }: UseGroupDataOptions) {
  const { search, category, tags, sort } = useFilters();
  
  const { 
    data: group, 
    isLoading: isGroupPending, 
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
    categoryId: category,
    tagId: tags?.[0],
    searchQuery: search,
    sortOrder: sort,
  });

  const photos = data?.pages.flatMap(p => p.items) || [];
  const totalCount = data?.pages[0]?.total || 0;

  const loading = isGroupPending || isPhotosPending;
  const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));
  const error = (groupError || photosError) ? (getErrorMessage(groupError || photosError)) : null;

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
