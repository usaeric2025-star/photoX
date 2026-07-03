import { Photo } from '#src/types/index.js';
import { updatePhoto as update, BatchActionResult, deleteMany, batchUpdate } from '#src/services/photo/commands.js';
import { queryKeys } from '#lib/query/keys.js';
import { useMutation, useQueryClient, CancelledError } from '#lib/query/index.js';
import { syncBatchPhotoTags } from '#src/services/tag/commands.js';
import { showToast } from '#lib/ui/toast.js';
import { useSelectionActions } from '#src/hooks/index.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { useTranslation } from '#src/hooks/index.js';

/**
 * 照片編輯 Mutation
 */

// 1. 照片編輯
export const usePhotoEditMutation = () => {
  const { uiTranslations: t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Photo> }) => {
      const { tags, ...coreUpdates } = updates;

      const res = await update(id, coreUpdates as Partial<Photo>);
      
      if (tags && Array.isArray(tags)) {
        const tagIds = tags.map(t => typeof t === 'object' && t !== null ? String((t as { id?: string | number }).id) : String(t)).filter(Boolean);
        const tagSources: Record<string, "user"> = {};
        tagIds.forEach(tId => {
          tagSources[tId] = "user";
        });
        await syncBatchPhotoTags([id], tagIds, undefined, tagSources);
      }
      
      return res as Photo;
    },
    onMutate: async ({ id, updates }) => {
      // 取消相關查詢以避免衝突
      await queryClient.cancelQueries({ queryKey: queryKeys.photos.all });

      // 保存舊數據
      const previousPhotos = queryClient.getQueryData(queryKeys.photos.all);

      // 樂觀更新 (可選，如果需要更即時的反饋)
      // queryClient.setQueryData(queryKeys.photos.all, (old: any) => ...)

      return { previousPhotos };
    },
    onSuccess: () => {
      showToast.success(t.photoUpdated);
    },
    onError: (err, variables, context) => {
      if (err instanceof CancelledError) return;
      ErrorFactory.handle(err, { context: 'photo-update' });
      // 如果有樂觀更新，這裡應該回滾
      // queryClient.setQueryData(queryKeys.photos.all, context?.previousPhotos);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.photos.all });
    }
  });
};

// 2. 照片刪除
export const usePhotoDelete = () => {
  const { clearSelection } = useSelectionActions();
  const { uiTranslations: t } = useTranslation();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (ids: string | string[]) => {
      const idArray = Array.isArray(ids) ? ids : [ids];
      return await deleteMany(idArray);
    },
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.photos.all });
      const previousPhotos = queryClient.getQueryData(queryKeys.photos.all);
      return { previousPhotos };
    },
    onSuccess: () => {
      showToast.success(t.photoDeleted || '照片已刪除');
      clearSelection();
    },
    onError: (err) => {
      if (err instanceof CancelledError) return;
      ErrorFactory.handle(err, { context: 'photo-delete' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.photos.all });
    }
  });
};

// 3. 批量編輯
export const usePhotoBatchEdit = () => {
  const { uiTranslations: t } = useTranslation();
  const { clearSelection } = useSelectionActions();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: Partial<Photo> }) => {
      const { tags, ...coreUpdates } = updates;
      
      const res = await batchUpdate(ids, coreUpdates as Partial<Photo>);
      
      if (tags && Array.isArray(tags)) {
        const tagIds = (tags as { id: string | number }[]).filter(t => t && t.id).map(t => String(t.id));
        const tagSources: Record<string, "user"> = {};
        tagIds.forEach(tId => {
          tagSources[tId] = "user";
        });
        await syncBatchPhotoTags(ids, tagIds, undefined, tagSources);
      }
      
      return res;
    },
    onSuccess: (res) => {
      const count = res?.successCount || 0;
      showToast.success(typeof t.batchUpdateSuccess === 'function' ? t.batchUpdateSuccess(count) : (t.batchUpdateSuccess || `成功更新 ${count} 張照片`));
      clearSelection();
    },
    onError: (err) => {
      if (err instanceof CancelledError) return;
      ErrorFactory.handle(err, { context: 'photo-batch-update' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.photos.all });
    }
  });
};

// 4. 釘選/取消釘選
export const useTogglePin = () => {
  const { uiTranslations: t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      const res = await update(id, { isPinned });
      if (!res) throw new Error('Failed to update photo');
      return res;
    },
    onSuccess: (_, { isPinned }) => {
      showToast.success(typeof t.togglePinnedSuccess === 'function' ? t.togglePinnedSuccess(isPinned) : t.togglePinnedSuccess);
    },
    onError: (err) => {
      if (err instanceof CancelledError) return;
      ErrorFactory.handle(err, { context: 'photo-toggle-pin' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.photos.all });
    }
  });
};


