import { useMemo, useState, useCallback } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { useAppQuery, useAppMutation } from '#lib/query/index.js';
import { queryKeys } from '#lib/query/keys.js';
import { api } from '#lib/api.js';
import { STALE_TIMES } from '#lib/query/config.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { Photo } from '#src/types/index.js';
import { PhotoListItem } from '#shared/apiContractSchema.js';
import { useFilters } from '../ui/useUI.js';
import { userAtom, formStateAtom, uploadAsGroupAtom } from '#src/store/index.js';
import { resetForm, updateForm } from '#lib/store/index.js';
import { useOptimisticPhotoMutation } from '#lib/query/optimistic.js';
import { showToast } from '#lib/ui/toast.js';
import { useTranslation, useNormalizedLocation } from '../core/index.js';
import { hapticFeedback } from '#lib/ui/haptics.js';
import { createTask } from '#lib/task-queue/index.js';
import { executeBatchUpload } from '#lib/task-queue/adapters/upload.js';
import { generateId } from '#lib/id.js';
import { useSelectionActions, batchEditingIdsAtom } from '#src/hooks/selection/useSelection.js';
import { runBatchAnalysis } from '#src/features/ai/orchestration.js';
import { PhotoEditFormData } from '#lib/valibot/schemas/photo.js';
import { queryClient as globalQueryClient } from '#lib/query/index.js';
import { mapToDb, mapSupabasePhoto } from '#src/utils/mappers/photo.js';
import { uploadToR2 } from '#src/lib/upload/index.js';
import { supabase } from '#lib/supabase.js';
import { SupabasePhotoRaw } from '#src/types/supabase.js';

export interface ListPhotosResponse {
  items: PhotoListItem[];
  total: number;
  nextCursor: string | null;
  page: number;
}

interface UsePhotosOptions {
  categoryId?: string | null;
  tagId?: string | null;
  groupId?: string | null;
  searchQuery?: string | null;
  sortOrder?: 'newest' | 'oldest' | 'rating' | 'views' | 'date' | 'name' | 'size';
  mode?: 'public' | 'admin';
  pageSize?: number;
  onlyGroupsCover?: boolean;
}

/**
 * Update a single photo (Standalone utility)
 */
export async function updatePhoto(id: string, initialUpdates: Partial<Photo>): Promise<Photo | null> {
  if (!id || id.startsWith('temp-')) {
    throw new Error('无效的照片ID');
  }
  const updates = { ...initialUpdates };
  if (updates.uri && updates.uri.startsWith('data:image')) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('NO_ACTIVE_SESSION');
        
    // Convert base64 to Blob
    const response = await fetch(updates.uri);
    const blob = await response.blob();
    const imageUrl = await uploadToR2(blob, id);
        
    updates.imageUrl = imageUrl;
    updates.updatedAt = new Date().toISOString();
    delete updates.uri;
  }
  const dbUpdates = mapToDb(updates);
  const rawData = await ErrorFactory.unwrap<SupabasePhotoRaw>(
    api.photos.update.$post({ json: { id, updates: dbUpdates } }),
    'Update photo failed'
  );
    
  return rawData ? mapSupabasePhoto(rawData) : null;
}

/**
 * usePhotos
 * 核心無限捲動照片列表查詢。
 */
export function usePhotos(options: UsePhotosOptions = {}) {
  const {
    categoryId,
    tagId,
    groupId,
    searchQuery,
    sortOrder = 'newest',
    mode = 'public',
    pageSize = 48,
    onlyGroupsCover = true
  } = options;

  return useInfiniteQuery({
    queryKey: queryKeys.photos.list({
      categoryId,
      tagId,
      groupId,
      searchQuery,
      sortOrder,
      mode,
      onlyGroupsCover
    }),
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      const res = await api.photos.list.$post({
        json: {
          page: Number(pageParam),
          limit: Number(pageSize),
          categoryId: categoryId || undefined,
          tagId: tagId || undefined,
          groupId: groupId || undefined,
          searchQuery: searchQuery || undefined,
          sortOrder: sortOrder,
          isAdminMode: mode === 'admin',
          onlyGroupsCover: onlyGroupsCover,
        },
      });
      const response = await ErrorFactory.unwrap<ListPhotosResponse>(res, 'Failed to fetch photos');
      return {
        ...response,
        page: response.page || (typeof pageParam === 'number' ? pageParam : 1)
      };
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage || !lastPage.items || lastPage.items.length < pageSize) return undefined;
      return (lastPage.page || 1) + 1;
    },
    staleTime: STALE_TIMES.MEDIUM,
  });
}

/**
 * usePhoto
 * 獲取單個照片的詳細信息。
 */
export function usePhoto(id: string | null) {
  return useAppQuery(
    id ? queryKeys.photos.detail(id) : null,
    async () => {
      if (!id) return null;
      const res = await api.photos['by-ids'].$post({ json: { ids: [id] } }).then(async (res) => { if (res.ok) { const data = await res.json() as any; return { ...res, json: () => ({ ...data, data: data.success ? data.data[0] : null }) } as any; } return res; });
      return ErrorFactory.unwrap<Photo>(res, 'Failed to fetch photo detail');
    },
    {
      staleTime: STALE_TIMES.LONG,
      enabled: !!id,
    }
  );
}

/**
 * usePhotoAIResult
 * 獲取照片的 AI 分析結果。
 */
export function usePhotoAIResult(id: string | null, options: { enabled?: boolean } = {}) {
  return useAppQuery(
    id ? ['photos', id, 'ai-result'] : null,
    async () => {
      if (!id) return null;
      const res = await api.ai['result'][':photoId'].$get({ param: { photoId: id } });
      return ErrorFactory.unwrap<any>(res, 'Failed to fetch AI result');
    },
    {
      staleTime: STALE_TIMES.LONG,
      enabled: !!id && (options.enabled !== false),
    }
  );
}

/**
 * useInvalidatePhotos
 * 全局快取失效調度中心。
 */
export function useInvalidatePhotos() {
  const queryClient = useQueryClient();

  const invalidateList = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.photos.lists() });
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
  }, [queryClient]);

  const invalidateDetail = useCallback((photoId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.photos.detail(photoId) });
    queryClient.invalidateQueries({ queryKey: ['photos', 'ai-result', photoId] });
  }, [queryClient]);

  const invalidateTags = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
  }, [queryClient]);

  const invalidateCategories = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
  }, [queryClient]);

  const invalidateManufacturers = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.manufacturers.all });
  }, [queryClient]);

  const invalidateAll = useCallback(() => {
    invalidateList();
    invalidateTags();
    invalidateCategories();
    invalidateManufacturers();
    queryClient.invalidateQueries({ queryKey: queryKeys.diagnostics.all });
  }, [invalidateList, invalidateTags, invalidateCategories, invalidateManufacturers, queryClient]);

  return {
    invalidateList,
    invalidateDetail,
    invalidateTags,
    invalidateCategories,
    invalidateManufacturers,
    invalidateAll
  };
}

/**
 * usePhotoMutations
 * 整合所有照片編輯、刪除、置頂等 Mutation。
 */
export function usePhotoMutations() {
  const { t } = useTranslation();
  const { invalidateAll, invalidateList } = useInvalidatePhotos();

  const editMutation = useOptimisticPhotoMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      return ErrorFactory.unwrap(
        api.photos.update.$post({ json: { id, updates } }),
        t('updateFailed')
      );
    },
    onMutateOptimistic: ({ id, updates }) => ({
      ids: id,
      updater: (photo: Photo) => ({ ...photo, ...updates } as Photo)
    }),
    errorContext: 'editPhoto',
    onSuccess: () => {
      showToast.success(t('updateSuccess'));
      invalidateAll();
    }
  });

  const batchEditMutation = useOptimisticPhotoMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: Record<string, unknown> }) => {
      return ErrorFactory.unwrap(
        api.photos.batch.$post({ json: { ids, updates } }),
        t('updateFailed')
      );
    },
    onMutateOptimistic: ({ ids, updates }) => ({
      ids,
      updater: (photo: Photo) => ({ ...photo, ...updates } as Photo)
    }),
    errorContext: 'batchEdit',
    onSuccess: () => {
      showToast.success(t('updateSuccess'));
      invalidateAll();
    }
  });

  const deleteMutation = useOptimisticPhotoMutation({
    mutationFn: async (idOrIds: string | string[]) => {
      const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
      return ErrorFactory.unwrap(
        api.photos.delete.$post({ json: { ids } }),
        t('deleteFailed')
      );
    },
    onMutateOptimistic: (idOrIds) => ({
      ids: idOrIds,
      updater: () => null as any
    }),
    errorContext: 'deletePhoto',
    onSuccess: () => {
      invalidateList();
    }
  });

  const togglePinMutation = useOptimisticPhotoMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      return ErrorFactory.unwrap(
        api.photos.update.$post({ json: { id, updates: { isPinned } } }),
        t('updateFailed')
      );
    },
    onMutateOptimistic: ({ id, isPinned }) => ({
      ids: id,
      updater: (photo: Photo) => ({ ...photo, isPinned } as Photo)
    }),
    errorContext: 'togglePin',
    onSuccess: (_, variables) => {
      showToast.success(variables.isPinned ? t('pinSuccess') : t('unpinSuccess'));
    }
  });

  const togglePin = useCallback(async (args: { id: string; isPinned: boolean }) => {
    return togglePinMutation.mutateAsync(args);
  }, [togglePinMutation]);

  return {
    editMutation,
    batchEditMutation,
    deleteMutation,
    togglePinMutation,
    togglePin,
    editPhotoAsync: editMutation.mutateAsync,
    batchEditAsync: batchEditMutation.mutateAsync,
    deletePhotoAsync: deleteMutation.mutateAsync,
    isBatchEditing: batchEditMutation.isPending,
    isDeleting: deleteMutation.isPending
  };
}

/**
 * usePhotoUpload
 * 處理照片上傳邏輯。
 */
export function usePhotoUpload() {
  const { t } = useTranslation();
  const user = useAtomValue(userAtom);
  const isUploadGroup = useAtomValue(uploadAsGroupAtom);

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    try {
      hapticFeedback.medium();
      const userId = user?.id;
      const isGroup = isUploadGroup && fileArray.length > 1;
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
  }, [user?.id, t, isUploadGroup]);

  return { uploadFiles };
}

/**
 * useBatchEdit
 * 處理批量編輯。
 */
export function useBatchEdit() {
  const { t } = useTranslation();
  const batchEditingIds = useAtomValue(batchEditingIdsAtom);
  const { patch: patchSelection } = useSelectionActions();
  const formState = useAtomValue(formStateAtom);
  const { batchEditAsync, deletePhotoAsync, isBatchEditing, isDeleting } = usePhotoMutations();
  const [location, setLocation] = useNormalizedLocation();

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
    if (location.startsWith('/admin/batch-edit')) {
      setLocation('/admin');
    }
  };

  const handleDelete = async (selectedIds: string[]) => {
    const ids = batchEditingIds || selectedIds;
    if (!ids || ids.length === 0) return;
    await deletePhotoAsync(ids);
    patchSelection({ batchEditingIds: null, selectedIds: [] });
    if (location.startsWith('/admin/batch-edit')) {
      setLocation('/admin');
    }
  };

  const handleClose = () => {
    patchSelection({ batchEditingIds: null });
    resetForm();
    if (location.startsWith('/admin/batch-edit')) {
      setLocation('/admin');
    }
  };

  return {
    batchEditIds: batchEditingIds || [],
    formState,
    handleUpdateForm: updateForm,
    handleSave,
    handleDelete,
    handleClose,
    isSyncing: isBatchEditing || isDeleting,
  };
}

/**
 * useAIBatchAnalysis
 */
export function useAIBatchAnalysis() {
  const { t } = useTranslation();
  const user = useAtomValue(userAtom);
  const { invalidateAll } = useInvalidatePhotos();

  const handleBatchAiAnalyze = useCallback(async (targetPhotos: Photo[]) => {
    if (!targetPhotos || targetPhotos.length === 0) {
      ErrorFactory.handle(t('selectPhotoFirst'), { context: t('batchAi') });
      return;
    }

    showToast.info(t('aiAnalyzing'));
    const taskTitle = t('aiBatchTask', targetPhotos.length);

    createTask<{ successCount: number; groupSuccess: boolean }>({
      label: taskTitle,
      type: 'ai-analyze',
      userId: user?.id,
      meta: { photoCount: targetPhotos.length },
      execute: async (signal, onProgress) => {
        const { successCount, groupSuccess } = await runBatchAnalysis({
          targetPhotos,
          onProgress
        });
        invalidateAll();
        return { successCount, groupSuccess };
      },
      onComplete: (result) => {
        showToast.success(t('aiAnalyzeSuccess', result.successCount));
      }
    });
  }, [invalidateAll, t, user?.id]);

  return { handleBatchAiAnalyze };
}

/**
 * usePhotoWall
 */
export function usePhotoWall(mode: 'public' | 'admin' = 'public') {
  const { search, category, tags, sort, showGroupsCollapsed } = useFilters();

  const queryOptions: UsePhotosOptions = useMemo(() => ({
    categoryId: category,
    tagId: tags?.[0],
    searchQuery: search,
    sortOrder: sort as any,
    mode,
    onlyGroupsCover: showGroupsCollapsed,
  }), [category, tags, search, sort, mode, showGroupsCollapsed]);

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
