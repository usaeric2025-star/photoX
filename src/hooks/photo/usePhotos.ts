import { useMemo, useCallback } from 'react';
import { useAppInfiniteQuery, useAppQuery, photoKeys, keepPreviousData, queryClient } from '#lib/query/index.js';
import { queryKeys } from '#lib/query/keys.js';
import { api } from '#lib/api.js';
import { PhotoListItem, ApiResponse } from '#shared/apiContractSchema.js';
import { Photo } from '#src/types/index.js';
import { STALE_TIMES } from '#lib/query/config.js';
import { mapSupabasePhoto } from '#src/services/mappers/photo.js';
import { SupabasePhotoRaw } from '#src/types/supabase.js';
import { useOptimisticPhotoMutation } from '#lib/query/optimistic.js';
import { showToast } from '#lib/ui/toast.js';
import { useAuth, uploadAsGroup, useSignal, useUI, UIStoreState } from '#lib/store/index.js';
import { useTranslation } from '../core/index.js';
import { hapticFeedback } from '#lib/ui/haptics.js';
import { createTask } from '#lib/task-queue/index.js';
import { executeBatchUpload } from '#lib/task-queue/adapters/upload.js';
import { generateId } from '#lib/id.js';
import { logger } from '#lib/logger.js';
import { useSelectionActions, batchEditingIdsSignal } from '../../services/selection/selectionService.js';
import { useAppRouter } from '#lib/router/index.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';

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
      return ErrorFactory.unwrap<PhotoListResponse>(
        api.photos.list.$post({ 
          json: { ...fetchParams, cursor: pageParam as string | undefined } 
        }),
        '獲取照片列表失敗'
      );
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
  const { t } = useTranslation();
  return useAppQuery(
    photoId ? photoKeys.detail(photoId) : null,
    async () => {
      if (!photoId) return null;
      const rawList = await ErrorFactory.unwrap<SupabasePhotoRaw[]>(
        api.photos['by-ids'].$post({
          json: { ids: [photoId] }
        }),
        t('fetchPhotoFailed')
      );
      const rawData = rawList[0];
      return rawData ? mapSupabasePhoto(rawData) : null;
    },
    {
      staleTime: STALE_TIMES.REALTIME,
    }
  );
};

// --- Mutation Hooks (with Optimistic Updates) ---

export function usePhotoMutations() {
  const { t } = useTranslation();
  // 1. 通用更新 Mutation (支援樂觀更新)
  const updateMutation = useOptimisticPhotoMutation<{ id: string; updates: Partial<Photo> }>({
    mutationFn: async ({ id, updates }) => ErrorFactory.unwrap<Photo>(
      api.photos.update.$post({ json: { id, updates } }),
      'Failed to update photo'
    ),
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
      return ErrorFactory.unwrap<boolean>(
        api.photos.delete.$post({ json: { ids: idArray } }),
        'Failed to delete photos'
      );
    },
    onMutateOptimistic: (ids) => ({
      ids,
      updater: () => null // 從快取中移除
    }),
    errorContext: 'photo-delete',
    onSuccess: () => {
      showToast.success(t('photoDeleted'));
    }
  });

  // 3. 批量更新 Mutation
  const batchEditMutation = useOptimisticPhotoMutation<{ ids: string[]; updates: Record<string, unknown> }>({
    mutationFn: async ({ ids, updates }) => ErrorFactory.unwrap<boolean>(
      api.photos.batch.$post({ json: { ids, updates } }),
      'Failed to update photos in batch'
    ),
    onMutateOptimistic: ({ ids, updates }) => ({
      ids,
      updater: (photo) => ({ ...photo, ...updates } as Photo)
    }),
    errorContext: 'photo-batch-update',
    onSuccess: () => {
      showToast.success(t('batchUpdateSuccess'));
    }
  });

  // 4. 置頂 Mutation
  const togglePinMutation = useOptimisticPhotoMutation<{ id: string; isPinned: boolean }>({
    mutationFn: async ({ id, isPinned }) => ErrorFactory.unwrap<Photo>(
      api.photos.update.$post({ json: { id, updates: { isPinned } } }),
      'Failed to pin photo'
    ),
    onMutateOptimistic: ({ id, isPinned }) => ({
      ids: id,
      updater: (photo) => ({ ...photo, isPinned } as Photo)
    }),
    errorContext: 'photo-toggle-pin'
  });

  // 快捷操作介面
  const toggleHide = async (id: string, currentHidden: boolean) => {
    return updateMutation.mutateAsync({ id, updates: { isHidden: !currentHidden } });
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
    toggleHide,
    isPending: updateMutation.isPending || deleteMutation.isPending || batchEditMutation.isPending,
    isBatchEditing: batchEditMutation.isPending,
    isDeleting: deleteMutation.isPending
  };
}

// --- Invalidation Helpers ---

export function useInvalidatePhotos() {
  const invalidateList = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.photos.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
  }, []);

  const invalidateDetail = useCallback((photoId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.photos.detail(photoId) });
    queryClient.invalidateQueries({ queryKey: ['photos', 'ai-result', photoId] });
  }, []);

  const invalidateTags = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
  }, []);

  const invalidateCategories = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
  }, []);

  const invalidateAll = useCallback(() => {
    invalidateList();
    invalidateTags();
    invalidateCategories();
  }, [invalidateList, invalidateTags, invalidateCategories]);

  return {
    invalidateList,
    invalidateDetail,
    invalidateTags,
    invalidateCategories,
    invalidateAll
  };
}

/**
 * usePhotoWall
 * A flattened wrapper for usePhotos that provides a simpler API for grid/list views.
 */
export function usePhotoWall(filters?: Record<string, unknown>) {
  const stableFilters = useMemo(() => filters || {}, [JSON.stringify(filters)]);

  const {
    data,
    isPending,
    isFetching,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = usePhotos(stableFilters);

  const photos = useMemo(() => {
    return data?.pages.flatMap((page) => page.items) || [];
  }, [data]);

  const totalCount = data?.pages[0]?.total || 0;

  return {
    photos,
    total: totalCount,
    hasMore: hasNextPage,
    isLoading: isPending,
    isLoadingMore: isFetchingNextPage,
    loadMore: fetchNextPage,
    refresh: refetch,
    error: isError ? error : null,
    isFetching
  };
}

/**
 * usePhotoUpload
 * Handles batch photo uploads using the task queue.
 */
export function usePhotoUpload() {
  const user = useAuth(s => s.user);
  const { t } = useTranslation();

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    try {
      hapticFeedback.medium();
      const userId = user?.id;
      
      const isGroup = uploadAsGroup.value && fileArray.length > 1;
      const groupId = isGroup ? generateId() : undefined;

      createTask({
        label: t('uploadTaskLabel', fileArray.length),
        type: 'upload',
        userId,
        meta: {
          photoCount: fileArray.length,
          groupId: groupId,
        },
        execute: executeBatchUpload(fileArray, userId, { groupId }),
        onError: (err) => {
          ErrorFactory.handle(err, { context: 'usePhotoUpload.uploadFiles' });
        }
      });
    } catch (error) {
      ErrorFactory.handle(error, { context: 'usePhotoUpload.execute' });
    }
  }, [user?.id, t]);

  return { uploadFiles };
}

/**
 * useBatchEdit
 * Handles batch editing and deletion of multiple photos.
 */
export function useBatchEdit() {
  const batchEditingIds = useSignal(batchEditingIdsSignal);
  const { patch: patchSelection } = useSelectionActions();
  const formState = useUI((s: UIStoreState) => s.formState);
  const patch = useUI((state: UIStoreState) => state.patch);
  const updateForm = useUI((s: UIStoreState) => s.updateForm);
  const resetForm = useUI((s: UIStoreState) => s.resetForm);
  const { batchEditAsync, deletePhotoAsync, isBatchEditing, isDeleting } = usePhotoMutations();
  const isPending = isBatchEditing || isDeleting;
  const { navigate, route } = useAppRouter();

  const handleSave = async (selectedIds: string[]) => {
    const ids = batchEditingIds || selectedIds;
    if (!ids || ids.length === 0) return;
    
    const updates = { ...formState } as Record<string, unknown>;
    const cleanUpdates: Record<string, unknown> = {};
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== '' && value !== undefined) {
        if (Array.isArray(value) && value.length === 0) return;
        cleanUpdates[key] = value;
      }
    });

    await batchEditAsync({ ids, updates: cleanUpdates });
    patchSelection({ batchEditingIds: null });
    resetForm();
    
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    if (route?.name === 'adminBatchEdit' || pathname.startsWith('/admin/batch-edit')) {
      navigate.admin();
    }
  };

  const handleDelete = async (selectedIds: string[]) => {
    const ids = batchEditingIds || selectedIds;
    if (!ids || ids.length === 0) return;
    
    await deletePhotoAsync(ids);
    patchSelection({ batchEditingIds: null, selectedIds: [] });
    resetForm();
    
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    if (route?.name === 'adminBatchEdit' || pathname.startsWith('/admin/batch-edit')) {
      navigate.admin();
    }
  };

  const handleClose = () => {
    patchSelection({ batchEditingIds: null });
    resetForm();
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    if (route?.name === 'adminBatchEdit' || pathname.startsWith('/admin/batch-edit')) {
      navigate.admin();
    }
  };

  return {
    batchEditIds: batchEditingIds || [],
    formState,
    handleUpdateForm: updateForm,
    handleSave,
    handleDelete,
    handleClose,
    isSyncing: isPending,
  };
}
