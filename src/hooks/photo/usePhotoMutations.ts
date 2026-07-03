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

interface SWRPhotoPage {
  data?: Photo[];
  items?: Photo[];
}

/**
 * 照片编辑 Mutation
 */
// 1. 照片编辑
export const usePhotoEditMutation = () => {
  const { uiTranslations: t } = useTranslation();
  const { mutate: swrMutate } = useSWRConfig();

  return useAppMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Photo> }) => {
      const { tags, ...coreUpdates } = updates;

      // 樂觀更新
      await swrMutate(
        (key: unknown) => typeof key === 'string' ? key.includes('photos') : JSON.stringify(key).includes('photos'),
        (currentData: SWRPhotoPage[] | SWRPhotoPage | undefined) => {
          if (!currentData) return currentData;
          const updater = (items: Photo[]) => items.map(p => p.id === id ? { ...p, ...coreUpdates } : p);

          if (Array.isArray(currentData)) {
            return currentData.map(page => ({
              ...page,
              data: page.data ? updater(page.data as Photo[]) : page.data,
              items: page.items ? updater(page.items as Photo[]) : page.items
            }));
          } else {
            return {
              ...currentData,
              data: currentData.data ? updater(currentData.data as Photo[]) : currentData.data,
              items: currentData.items ? updater(currentData.items as Photo[]) : currentData.items
            };
          }
        },
        { revalidate: false }
      );

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
      appQuery.invalidatePhotos();
    }
  });
};

// 2. 照片删除
export const usePhotoDelete = () => {
  const { clearSelection } = useSelectionActions();
  const { uiTranslations: t } = useTranslation();
  const { mutate: swrMutate } = useSWRConfig();
  
  return useAppMutation({
    mutationFn: async (ids: string | string[]) => {
      const idArray = Array.isArray(ids) ? ids : [ids];
      const filterIds = new Set(idArray);
      
      // 樂觀刪除
      await swrMutate(
         (key: unknown) => typeof key === 'string' ? key.includes('photos') : JSON.stringify(key).includes('photos'),
         (currentData: SWRPhotoPage[] | SWRPhotoPage | undefined) => {
            if (!currentData) return currentData;
            
            const updater = (items: Photo[]) => items.filter((p: Photo) => !filterIds.has(p.id));
            
            if (Array.isArray(currentData)) {
              return currentData.map(page => ({
                ...page,
                data: page.data ? updater(page.data as Photo[]) : page.data,
                items: page.items ? updater(page.items as Photo[]) : page.items
              }));
            } else {
              return {
                ...currentData,
                data: currentData.data ? updater(currentData.data as Photo[]) : currentData.data,
                items: currentData.items ? updater(currentData.items as Photo[]) : currentData.items
              };
            }
         },
         { revalidate: true }
      );
      
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
  const { mutate: swrMutate } = useSWRConfig();

  return useAppMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: Partial<Photo> }) => {
      const { tags, ...coreUpdates } = updates;
      const updateIds = new Set(ids);
      
      // 樂觀批量更新
      await swrMutate(
         (key: unknown) => typeof key === 'string' ? key.includes('photos') : JSON.stringify(key).includes('photos'),
         (currentData: SWRPhotoPage[] | SWRPhotoPage | undefined) => {
            if (!currentData) return currentData;
            
            const updater = (items: Photo[]) => items.map(p => updateIds.has(p.id) ? { ...p, ...coreUpdates } : p);

            if (Array.isArray(currentData)) {
              return currentData.map(page => ({
                ...page,
                data: page.data ? updater(page.data as Photo[]) : page.data,
                items: page.items ? updater(page.items as Photo[]) : page.items
              }));
            } else {
              return {
                ...currentData,
                data: currentData.data ? updater(currentData.data as Photo[]) : currentData.data,
                items: currentData.items ? updater(currentData.items as Photo[]) : currentData.items
              };
            }
         },
         { revalidate: true }
      );

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
      // 樂觀更新
      await swrMutate(
        (key: unknown) => typeof key === 'string' ? key.includes('photos') : JSON.stringify(key).includes('photos'),
        (currentData: SWRPhotoPage[] | SWRPhotoPage | undefined) => {
          if (!currentData) return currentData;
          const updater = (items: Photo[]) => items.map(p => p.id === id ? { ...p, isPinned } : p);

          if (Array.isArray(currentData)) {
            return currentData.map(page => ({
              ...page,
              data: page.data ? updater(page.data as Photo[]) : page.data,
              items: page.items ? updater(page.items as Photo[]) : page.items
            }));
          } else {
            return {
              ...currentData,
              data: currentData.data ? updater(currentData.data as Photo[]) : currentData.data,
              items: currentData.items ? updater(currentData.items as Photo[]) : currentData.items
            };
          }
        },
        { revalidate: false }
      );
      
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


