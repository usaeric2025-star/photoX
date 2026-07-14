import { useFilters } from '#src/hooks/ui/useFilters.js';
import { usePhotos } from '../photo/index.js';
import { useGroupDetail } from './useGroupDetail.js';

/**
 * useGroupData
 * 
 * 整合群組詳細信息與群組內的照片列表。
 */
interface UseGroupDataOptions {
  groupId: string | null;
  isAdmin: boolean;
}

export function useGroupData({ groupId, isAdmin }: UseGroupDataOptions) {
  const { search, category, tags, sort } = useFilters();
  const { group, isLoading: isGroupPending, error: groupError } = useGroupDetail(groupId, isAdmin);

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
    onlyGroupsCover: false,
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
