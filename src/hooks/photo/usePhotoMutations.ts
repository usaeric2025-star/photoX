import { Photo } from '@/types';
import { updatePhoto as update, BatchActionResult, deleteMany, batchUpdate } from '@/services/photo/commands';
import { queryKeys } from '@/lib/query/keys';
import { useAppMutation, appQuery } from '@/lib/query';
import { syncBatchPhotoTags } from '@/services/tag/commands';
import { showToast } from '@/lib/ui/toast';
import { useSelectionActions } from '@/features/selection';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { useTranslation } from '@/hooks';

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
    onSuccess: () => {
      showToast.success(t.photoUpdated);
      appQuery.invalidatePhotos();
    },
    onError: (err) => {
      ErrorFactory.handle(err, { context: 'photo-update' });
    }
  });
};

// 2. 照片删除
export const usePhotoDelete = () => {
  const { clearSelection } = useSelectionActions();
  const { uiTranslations: t } = useTranslation();
  
  return useAppMutation({
    mutationFn: async (ids: string | string[]) => {
      return await deleteMany(Array.isArray(ids) ? ids : [ids]);
    },
    onSuccess: () => {
      showToast.success(t.photoDeleted);
      clearSelection();
      appQuery.invalidatePhotos();
    },
    onError: (err) => {
      ErrorFactory.handle(err, { context: 'photo-delete' });
    }
  });
};

// 3. 批量编辑
export const usePhotoBatchEdit = () => {
  const { uiTranslations: t } = useTranslation();
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
      showToast.success(typeof t.batchUpdateSuccess === 'function' ? t.batchUpdateSuccess(Array.isArray(res) ? res.length : 0) : t.batchUpdateSuccess);
      appQuery.invalidatePhotos();
    },
    onError: (err) => {
      ErrorFactory.handle(err, { context: 'photo-batch-update' });
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
    }
  });
};


