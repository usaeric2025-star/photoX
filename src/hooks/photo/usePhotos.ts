import { useMemo } from 'react';
import { useAppInfiniteQuery, useAppQuery, photoKeys, keepPreviousData, queryClient } from '#lib/query/index.js';
import { api } from '#lib/api.js';
import { PhotoListItem } from '#src/types/api.js';
import { Photo } from '#src/types/index.js';
import { STALE_TIMES } from '#lib/query/config.js';
import { mapSupabasePhoto } from '#src/services/mappers/photo.js';
import { SupabasePhotoRaw } from '#src/types/supabase.js';
import { useOptimisticPhotoMutation } from '#lib/query/optimistic.js';
import { showToast } from '#lib/ui/toast.js';

// --- Types ---

export type PhotoListFilters = Record<string, unknown>;

type PhotoListResponse = {
  success: boolean;
  data: PhotoListItem[];
  nextCursor: string | null;
  total: number;
};

// --- List Hook ---

export function usePhotos(params: PhotoListFilters = {}) {
  const { photoId, modal, anchor, ...fetchParams } = params;

  const result = useAppInfiniteQuery<PhotoListResponse, Error, string | undefined>(
    photoKeys.list(fetchParams),
    async (pageParam) => {
      const response = await api.photos.list.$post({ 
        json: { ...fetchParams, cursor: pageParam as string | undefined } 
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json() as PhotoListResponse;
    },
    {
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
      placeholderData: keepPreviousData,
    }
  );

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isFetching, error } = result;

  const mappedData = useMemo(() => {
    if (!data?.pages) {
      return { pages: [] };
    }
    return {
      pages: data.pages.map((p) => ({ items: p.data, total: p.total }))
    };
  }, [data]);

  return {
    data: mappedData,
    isPending: isLoading,
    isFetching,
    isError: !!error,
    error,
    fetchNextPage,
    hasNextPage: !!hasNextPage,
    isFetchingNextPage,
    refetch: result.refetch,
  };
}

// --- Detail Hook ---

export const usePhoto = (photoId: string | null | undefined) => {
  return useAppQuery(
    photoId ? photoKeys.detail(photoId) : null,
    async () => {
      if (!photoId) return null;
      const response = await api.photos['by-ids'].$post({
        json: { ids: [photoId] }
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      const rawData = result.data[0] as SupabasePhotoRaw;
      return rawData ? mapSupabasePhoto(rawData) : null;
    },
    {
      staleTime: STALE_TIMES.REALTIME,
    }
  );
};

// --- Mutation Hooks (with Optimistic Updates) ---

export function usePhotoMutations() {
  // 1. 通用更新 Mutation (支援樂觀更新)
  const updateMutation = useOptimisticPhotoMutation<{ id: string; updates: Partial<Photo> }>({
    mutationFn: async ({ id, updates }) => {
      const res = await api.photos.update.$post({ json: { id, updates } });
      return await res.json();
    },
    onMutateOptimistic: ({ id, updates }) => ({
      ids: id,
      updater: (photo) => ({ ...photo, ...updates } as Photo)
    }),
    errorContext: 'photo-update'
  });

  // 2. 刪除 Mutation
  const deleteMutation = useOptimisticPhotoMutation<string | string[]>({
    mutationFn: async (ids) => {
      const idArray = Array.isArray(ids) ? ids : [ids];
      const res = await api.photos.delete.$post({ json: { id: idArray[0], ids: idArray } });
      return await res.json();
    },
    onMutateOptimistic: (ids) => ({
      ids,
      updater: () => null // 從快取中移除
    }),
    errorContext: 'photo-delete',
    onSuccess: () => {
      showToast.success('照片已刪除');
    }
  });

  // 3. 批量更新 Mutation
  const batchEditMutation = useOptimisticPhotoMutation<{ ids: string[]; updates: Record<string, any> }>({
    mutationFn: async ({ ids, updates }) => {
      const res = await api.photos.batch.$post({ json: { ids, updates } });
      return await res.json();
    },
    onMutateOptimistic: ({ ids, updates }) => ({
      ids,
      updater: (photo) => ({ ...photo, ...updates } as Photo)
    }),
    errorContext: 'photo-batch-update',
    onSuccess: () => {
      showToast.success('批量修改成功');
    }
  });

  // 4. 置頂 Mutation
  const togglePinMutation = useOptimisticPhotoMutation<{ id: string; isPinned: boolean }>({
    mutationFn: async ({ id, isPinned }) => {
      const res = await api.photos.update.$post({ json: { id, updates: { isPinned } } });
      return await res.json();
    },
    onMutateOptimistic: ({ id, isPinned }) => ({
      ids: id,
      updater: (photo) => ({ ...photo, isPinned } as Photo)
    }),
    errorContext: 'photo-toggle-pin'
  });

  // 快捷操作介面
  const toggleStar = async (id: string, currentStarred: boolean) => {
    return updateMutation.mutateAsync({ id, updates: { isStarred: !currentStarred } });
  };

  const toggleHide = async (id: string, currentHidden: boolean) => {
    return updateMutation.mutateAsync({ id, updates: { isHidden: !currentHidden } });
  };

  const rotate = async (id: string, currentRotation: number = 0) => {
    const nextRotation = (currentRotation + 90) % 360;
    return updateMutation.mutateAsync({ id, updates: { rotation: nextRotation } });
  };

  return {
    update: updateMutation,
    remove: deleteMutation,
    batchEdit: batchEditMutation,
    togglePin: (params: { id: string; isPinned: boolean }) => togglePinMutation.mutate(params),
    // Aliases for compatibility
    editMutation: updateMutation,
    deleteMutation: deleteMutation,
    batchEditMutation: batchEditMutation,
    togglePinMutation: togglePinMutation,
    editPhotoAsync: updateMutation.mutateAsync,
    deletePhotoAsync: (ids: string | string[]) => {
      return deleteMutation.mutateAsync(ids);
    },
    batchEditAsync: batchEditMutation.mutateAsync,
    toggleStar,
    toggleHide,
    rotate,
    isPending: updateMutation.isPending || deleteMutation.isPending || batchEditMutation.isPending,
    isBatchEditing: batchEditMutation.isPending,
    isDeleting: deleteMutation.isPending
  };
}
