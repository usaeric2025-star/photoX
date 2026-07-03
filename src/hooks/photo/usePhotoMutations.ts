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
    onMutate: async ({ id, isPinned }) => {
      // 1. 取消相關查詢以避免衝突 (不使用 await 避免阻塞樂觀更新)
      queryClient.cancelQueries({ queryKey: queryKeys.photos.all });

      // 2. 備份舊數據 (用於回滾)
      const previousQueries = queryClient.getQueriesData({ queryKey: queryKeys.photos.all });

      // 3. 樂觀更新列表快取
      queryClient.setQueriesData({ queryKey: queryKeys.photos.all }, (old: any) => {
        if (!old) return old;

        // 處理 Infinite Query 的結構
        if (old.pages) {
          return {
            ...old,
            pages: old.pages.map((page: any) => {
              // 某些 API 可能返回 data，某些可能返回 items，同時處理
              const hasItems = Array.isArray(page.items);
              const hasData = Array.isArray(page.data);
              
              const updatedPage = { ...page };
              
              if (hasData) {
                updatedPage.data = page.data.map((photo: any) => 
                  photo.id === id ? { ...photo, isPinned } : photo
                );
              }
              
              if (hasItems) {
                updatedPage.items = page.items.map((photo: any) => 
                  photo.id === id ? { ...photo, isPinned } : photo
                );
              }
              
              return updatedPage;
            })
          };
        }

        // 處理單個項目的結構 (如果是普通 Query 或 Detail)
        const photoId = old.id || (old.data && typeof old.data === 'object' ? old.data.id : undefined);
        if (photoId === id) {
          if (old.data) {
            return { ...old, data: { ...old.data, isPinned } };
          }
          return { ...old, isPinned };
        }

        return old;
      });

      return { previousQueries };
    },
    onSuccess: (_, { isPinned }) => {
      showToast.success(typeof t.togglePinnedSuccess === 'function' ? t.togglePinnedSuccess(isPinned) : t.togglePinnedSuccess);
    },
    onError: (err, _variables, context) => {
      if (err instanceof CancelledError) return;
      
      // 發生錯誤時回滾
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, previousData]) => {
          queryClient.setQueryData(queryKey, previousData);
        });
      }
      
      ErrorFactory.handle(err, { context: 'photo-toggle-pin' });
    },
    onSettled: () => {
      // 延遲失效 2 秒，避免在快速操作時頻繁觸發全量重新拉取，讓樂觀更新結果穩定顯示
      // 同時確保資料最終一致性
      const timer = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.photos.all });
      }, 2000);
      return () => clearTimeout(timer);
    }
  });
};


