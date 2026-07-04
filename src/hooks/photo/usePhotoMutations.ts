import { useMutation, useQueryClient, CancelledError } from '#lib/query/index.js';
import { type QueryClient } from '@tanstack/react-query';
import { queryKeys } from '#lib/query/keys.js';
import { updatePhoto, deleteMany, batchUpdate } from '#src/services/photo/commands.js';
import { showToast } from '#lib/ui/toast.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { useTranslation, useSelectionActions, useInvalidatePhotos } from '#src/hooks/index.js';
import { Photo } from '#src/types/index.js';

/**
 * 照片樂觀更新工具
 */
interface PhotoPage {
  items?: Photo[];
  data?: Photo[];
}

interface InfinitePhotoData {
  pages: PhotoPage[];
  pageParams: unknown[];
}

interface SinglePhotoQuery {
  id?: string;
  data?: Photo;
}

const backupPhotosCache = async (queryClient: QueryClient) => {
  await queryClient.cancelQueries({ queryKey: queryKeys.photos.all });
  return queryClient.getQueriesData({ queryKey: queryKeys.photos.all });
};

const rollbackPhotosCache = (queryClient: QueryClient, previousQueries: [unknown, unknown][]) => {
  previousQueries.forEach(([queryKey, previousData]) => {
    queryClient.setQueryData(queryKey as any, previousData);
  });
};

const updatePhotosCache = (
  queryClient: QueryClient,
  ids: string | string[],
  updater: (photo: Photo) => Photo | null
) => {
  const idArray = Array.isArray(ids) ? ids : [ids];
  queryClient.setQueriesData({ queryKey: queryKeys.photos.all }, (old: InfinitePhotoData | Photo[] | SinglePhotoQuery | Photo | undefined) => {
    if (!old) return old;
    if (typeof old === 'object' && 'pages' in old && Array.isArray(old.pages)) {
      return {
        ...old,
        pages: old.pages.map((page: PhotoPage) => ({
          ...page,
          data: page.data?.map(p => idArray.includes(p.id) ? updater(p) : p).filter((p): p is Photo => p !== null),
          items: page.items?.map(p => idArray.includes(p.id) ? updater(p) : p).filter((p): p is Photo => p !== null),
        })),
      };
    }
    if (Array.isArray(old)) {
      return old.map(p => idArray.includes(p.id) ? updater(p) : p).filter((p): p is Photo => p !== null);
    }
    const singleOld = old as SinglePhotoQuery;
    const photoId = singleOld.id || (singleOld.data?.id);
    if (photoId && idArray.includes(photoId)) {
      if (singleOld.data) {
        const updated = updater(singleOld.data);
        return updated ? { ...singleOld, data: updated } : null;
      }
      return updater(old as unknown as Photo);
    }
    return old;
  });
};

/**
 * 照片相關的所有 Mutation 鉤子
 */
export const usePhotoMutations = () => {
  const queryClient = useQueryClient();
  const { uiTranslations: t } = useTranslation();
  const { clearSelection } = useSelectionActions();
  const { invalidateList, invalidateDetail } = useInvalidatePhotos();

  // 1. 編輯單張照片
  const editMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Photo> }) => {
      return await updatePhoto(id, updates);
    },
    onMutate: async ({ id, updates }) => {
      const previousQueries = await backupPhotosCache(queryClient);
      updatePhotosCache(queryClient, id, (photo) => ({ ...photo, ...updates }));
      return { previousQueries };
    },
    onSuccess: () => {
      showToast.success(t.photoUpdated);
    },
    onError: (err, _, context) => {
      if (err instanceof CancelledError) return;
      if (context?.previousQueries) rollbackPhotosCache(queryClient, context.previousQueries);
      ErrorFactory.handle(err, { context: 'photo-update' });
    },
    onSettled: (_, __, { id }) => {
      invalidateList();
      invalidateDetail(id);
    }
  });

  // 2. 切換置頂狀態
  const togglePinMutation = useMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      return await updatePhoto(id, { isPinned });
    },
    onMutate: async ({ id, isPinned }) => {
      const previousQueries = await backupPhotosCache(queryClient);
      updatePhotosCache(queryClient, id, (photo) => ({ ...photo, isPinned }));
      return { previousQueries };
    },
    onSuccess: (_, { isPinned }) => {
      showToast.success(typeof t.togglePinnedSuccess === 'function' ? t.togglePinnedSuccess(isPinned) : (isPinned ? '已置頂' : '已取消置頂'));
    },
    onError: (err, _, context) => {
      if (err instanceof CancelledError) return;
      if (context?.previousQueries) rollbackPhotosCache(queryClient, context.previousQueries);
      ErrorFactory.handle(err, { context: 'photo-toggle-pin' });
    },
    onSettled: () => {
      invalidateList();
    }
  });

  // 3. 刪除照片 (支援單張或批量)
  const deleteMutation = useMutation({
    mutationFn: async (ids: string | string[]) => {
      const idArray = Array.isArray(ids) ? ids : [ids];
      return await deleteMany(idArray);
    },
    onMutate: async (ids) => {
      const previousQueries = await backupPhotosCache(queryClient);
      updatePhotosCache(queryClient, ids, () => null);
      return { previousQueries };
    },
    onSuccess: () => {
      showToast.success(t.photoDeleted || '照片已删除');
      clearSelection();
    },
    onError: (err, _, context) => {
      if (err instanceof CancelledError) return;
      if (context?.previousQueries) rollbackPhotosCache(queryClient, context.previousQueries);
      ErrorFactory.handle(err, { context: 'photo-delete' });
    },
    onSettled: () => {
      invalidateList();
    }
  });

  // 4. 批量編輯
  const batchEditMutation = useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: Partial<Photo> }) => {
      return await batchUpdate(ids, updates);
    },
    onMutate: async ({ ids, updates }) => {
      const previousQueries = await backupPhotosCache(queryClient);
      updatePhotosCache(queryClient, ids, (photo) => ({ ...photo, ...updates }));
      return { previousQueries };
    },
    onSuccess: (res) => {
      const count = res?.successCount || 0;
      showToast.success(typeof t.batchUpdateSuccess === 'function' ? t.batchUpdateSuccess(count) : (t.batchUpdateSuccess || `成功更新 ${count} 张照片`));
      clearSelection();
    },
    onError: (err, _, context) => {
      if (err instanceof CancelledError) return;
      if (context?.previousQueries) rollbackPhotosCache(queryClient, context.previousQueries);
      ErrorFactory.handle(err, { context: 'photo-batch-update' });
    },
    onSettled: () => {
      invalidateList();
    }
  });

  return {
    editPhoto: editMutation.mutate,
    editPhotoAsync: editMutation.mutateAsync,
    togglePin: togglePinMutation.mutate,
    deletePhoto: deleteMutation.mutate,
    deletePhotoAsync: deleteMutation.mutateAsync,
    batchEdit: batchEditMutation.mutate,
    batchEditAsync: batchEditMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    isEditing: editMutation.isPending,
    isBatchEditing: batchEditMutation.isPending,
    // Raw mutation objects for advanced usage/compatibility
    editMutation,
    togglePinMutation,
    deleteMutation,
    batchEditMutation
  };
};
