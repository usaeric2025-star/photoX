import { useMemo } from 'react';
import { useFilters } from '#src/hooks/ui/useUI.js';
import { usePhotos } from '#src/hooks/photo/index.js';

/**
 * usePhotoWall
 * 專用於照片牆首頁的無限捲動及篩選數據綁定 Hook。
 * 遵循「就近整合」與「反過度拆分」規範，作為 PhotoWall 特有的 Local Hook。
 */
export function usePhotoWall(mode: 'public' | 'admin' = 'public') {
  const { search, category, tags, sort, showGroupsCollapsed, groupId } = useFilters();

  const queryOptions = useMemo(() => ({
    categoryId: category,
    tagId: tags?.[0],
    searchQuery: search,
    sortOrder: sort as any,
    isAdminMode: mode === 'admin',
    groupId,
    onlyGroupsCover: groupId ? false : showGroupsCollapsed,
  }), [category, tags, search, sort, mode, showGroupsCollapsed, groupId]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
    isLoading,
    error,
    refetch
  } = usePhotos(queryOptions);

  const photos = useMemo(() => {
    return data?.pages.flatMap((page) => page.items) || [];
  }, [data]);

  const total = data?.pages[0]?.total || 0;

  return {
    photos,
    total,
    fetchNextPage,
    loadMore: fetchNextPage,
    hasNextPage,
    hasMore: hasNextPage,
    isFetchingNextPage,
    isLoadingMore: isFetchingNextPage,
    isPending,
    isLoading,
    error,
    refetch,
    refresh: refetch
  };
}
