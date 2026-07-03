import { Photo } from '#src/types/index.js';
import { updatePhoto as update, BatchActionResult, deleteMany, batchUpdate } from '#src/services/photo/commands.js';
import { queryKeys } from '#lib/query/keys.js';
import { useAppMutation, appQuery } from '#lib/query/index.js';
import { useSWRConfig } from 'swr';
import { syncBatchPhotoTags } from '#src/services/tag/commands.js';
import { showToast } from '#lib/ui/toast.js';
import { useSelectionActions } from '#src/hooks/index.js';
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
      const count = res?.successCount || 0;
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
  const { mutate: swrMutate } = useSWRConfig();

  return useAppMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      // 樂觀更新 SWR 緩存：使用 matcher 函數遍歷匹配所有 key 包含 'photos' 的快取
      try {
        await swrMutate(
          (key: any) => {
            const keyStr = typeof key === 'string' ? key : JSON.stringify(key);
            return keyStr.includes('photos');
          },
          (currentData: any) => {
            if (!currentData) return currentData;
            if (Array.isArray(currentData)) {
              // SWRInfinite data (pages array)
              return currentData.map((page: any) => {
                if (page?.data && Array.isArray(page.data)) {
                  return {
                    ...page,
                    data: page.data.map((p: any) => p.id === id ? { ...p, isPinned } : p)
                  };
                }
                if (page?.items && Array.isArray(page.items)) {
                  return {
                    ...page,
                    items: page.items.map((p: any) => p.id === id ? { ...p, isPinned } : p)
                  };
                }
                return page;
              });
            } else {
              // Standard SWR query data (single page)
              if (currentData.data && Array.isArray(currentData.data)) {
                return {
                  ...currentData,
                  data: currentData.data.map((p: any) => p.id === id ? { ...p, isPinned } : p)
                };
              }
              if (currentData.items && Array.isArray(currentData.items)) {
                return {
                  ...currentData,
                  items: currentData.items.map((p: any) => p.id === id ? { ...p, isPinned } : p)
                };
              }
            }
            return currentData;
          },
          { revalidate: false }
        );
      } catch (err) {
        console.warn('Optimistic pin update failed:', err);
      }
      
      const res = await update(id, { is_pinned: isPinned });
      if (!res) throw new Error('Failed to update photo');
      return res;
    },
    onSuccess: (_, { isPinned }) => {
      showToast.success(typeof t.togglePinnedSuccess === 'function' ? t.togglePinnedSuccess(isPinned) : t.togglePinnedSuccess);
      // 在背景中重新驗證快取以確保資料與後端絕對一致
      appQuery.invalidatePhotos();
    },
    onError: (err) => {
      ErrorFactory.handle(err, { context: 'photo-toggle-pin' });
      appQuery.invalidatePhotos();
    }
  });
};


