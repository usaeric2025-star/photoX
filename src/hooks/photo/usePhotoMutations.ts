import { Photo } from '#src/types/index.js';
import { updatePhoto as update, BatchActionResult, deleteMany, batchUpdate } from '#src/services/photo/commands.js';
import { queryKeys } from '#lib/query/keys.js';
import { useAppMutation, appQuery } from '#lib/query/index.js';
import { syncBatchPhotoTags } from '#src/services/tag/commands.js';
import { showToast } from '#lib/ui/toast.js';
import { useSelectionActions } from '#src/features/selection/index.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { useTranslation } from '#src/hooks/index.js';

/**
 * 照片编辑 Mutation
 */
// 1. 照片编辑
export const usePhotoEditMutation = () => {
  const { uiTranslations: t } = useTranslation();
  return useAppMutation({
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
    onSuccess: (data, { id }) => {
      showToast.success(t.photoUpdated);
      appQuery.invalidatePhotos();
    },
    onError: (err, { id }) => {
      ErrorFactory.handle(err, { context: 'photo-update' });
      // Rollback is handled by invalidatePhotos usually, but we force it here
      appQuery.invalidatePhotos();
    }
  });
};

// 2. 照片删除
export const usePhotoDelete = () => {
  const { clearSelection } = useSelectionActions();
  const { uiTranslations: t } = useTranslation();
  
  return useAppMutation({
    mutationFn: async (ids: string | string[]) => {
      const idArray = Array.isArray(ids) ? ids : [ids];
      return await deleteMany(idArray);
    },
    onSuccess: () => {
      showToast.success(t.photoDeleted || '照片已刪除');
      clearSelection();
      appQuery.invalidatePhotos();
    },
    onError: (err) => {
      ErrorFactory.handle(err, { context: 'photo-delete' });
      appQuery.invalidatePhotos();
    }
  });
};

// 3. 批量编辑
export const usePhotoBatchEdit = () => {
  const { uiTranslations: t } = useTranslation();
  const { clearSelection } = useSelectionActions();

  return useAppMutation({
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
      const count = Array.isArray(res) ? res.length : 0;
      showToast.success(typeof t.batchUpdateSuccess === 'function' ? t.batchUpdateSuccess(count) : (t.batchUpdateSuccess || `成功更新 ${count} 張照片`));
      clearSelection();
      appQuery.invalidatePhotos();
    },
    onError: (err) => {
      ErrorFactory.handle(err, { context: 'photo-batch-update' });
      appQuery.invalidatePhotos();
    }
  });
};

// 4. 钉选/取消钉选
export const useTogglePin = () => {
  const { uiTranslations: t } = useTranslation();
  return useAppMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      const res = await update(id, { is_pinned: isPinned });
      if (!res) throw new Error('Failed to update photo');
      return res;
    },
    onSuccess: (_, { isPinned }) => {
      showToast.success(typeof t.togglePinnedSuccess === 'function' ? t.togglePinnedSuccess(isPinned) : t.togglePinnedSuccess);
      appQuery.invalidatePhotos();
    },
    onError: (err) => {
      ErrorFactory.handle(err, { context: 'photo-toggle-pin' });
      appQuery.invalidatePhotos();
    }
  });
};


