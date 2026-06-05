import { createMutationHook } from './factory';
import { Photo } from '@/types';
import { update, deleteMany, batchUpdate } from '@/services/photo/commands';
import { photoKeys } from '@/lib/queryKeys';
import { uploadImages } from '@/services/storage/uploadService';

export const usePhotoEdit = createMutationHook({
  entity: 'Photo',
  action: 'Update',
  mutationFn: ({ id, updates }: { id: string; updates: Partial<Photo> }) => update(id, updates),
  invalidateKeys: [photoKeys.all],
  onSuccessMessage: '照片更新成功',
});

export const usePhotoDelete = createMutationHook({
  entity: 'Photo',
  action: 'Delete',
  mutationFn: (ids: string | string[]) => deleteMany(Array.isArray(ids) ? ids : [ids]),
  invalidateKeys: [photoKeys.all],
  optimisticUpdate: async (ids: string | string[], queryClient: any) => {
    const idList = Array.isArray(ids) ? ids : [ids];
    const idSet = new Set(idList);

    // Cancel any outgoing refetches
    await Promise.all([
      queryClient.cancelQueries({ queryKey: photoKeys.all }),
    ]);

    // Snapshot the previous values
    const previousData = queryClient.getQueryData(photoKeys.all);

    // Optimistically update all infinite queries matching photoKeys.all
    queryClient.setQueriesData({ queryKey: photoKeys.all }, (old: any) => {
      if (!old || !old.pages) return old;
      return {
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          photos: page.photos.filter((p: Photo) => !idSet.has(p.id)),
        })),
      };
    });

    return { previousData };
  },
  rollback: (_err: any, _vars: any, context: any, queryClient: any) => {
    if (context?.previousData) {
      queryClient.setQueriesData({ queryKey: photoKeys.all }, context.previousData);
    }
  },
  onSuccessMessage: (data: any) => {
    if (data && typeof data === 'object' && 'successCount' in data) {
      if (data.failureCount > 0) {
        return `批量删除：成功 ${data.successCount}, 失败 ${data.failureCount}`;
      }
      return `已下架 ${data.successCount} 张照片`;
    }
    return '照片已删除';
  },
});

export const usePhotoBatchEdit = createMutationHook({
  entity: 'Photo',
  action: 'BatchUpdate',
  mutationFn: ({ ids, updates }: { ids: string[]; updates: Partial<Photo> }) => batchUpdate(ids, updates),
  invalidateKeys: [photoKeys.all],
  optimisticUpdate: async ({ ids, updates }: { ids: string[]; updates: Partial<Photo> }, queryClient: any) => {
    const idSet = new Set(ids);

    await Promise.all([
      queryClient.cancelQueries({ queryKey: photoKeys.all }),
    ]);

    const previousData = queryClient.getQueryData(photoKeys.all);

    queryClient.setQueriesData({ queryKey: photoKeys.all }, (old: any) => {
      if (!old || !old.pages) return old;
      return {
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          photos: page.photos.map((p: Photo) => 
            idSet.has(p.id) ? { ...p, ...updates } : p
          ),
        })),
      };
    });

    return { previousData };
  },
  rollback: (_err: any, _vars: any, context: any, queryClient: any) => {
    if (context?.previousData) {
      queryClient.setQueriesData({ queryKey: photoKeys.all }, context.previousData);
    }
  },
  onSuccessMessage: (data: any) => {
    if (data && typeof data === 'object' && 'successCount' in data) {
      if (data.failureCount > 0) {
        return `批量操作：成功 ${data.successCount}, 失败 ${data.failureCount}`;
      }
      return `批量操作已完成 (${data.successCount})`;
    }
    return '批量更新成功';
  },
});

export const useTogglePin = createMutationHook({
  entity: 'Photo',
  action: 'TogglePin',
  mutationFn: ({ id, isPinned }: { id: string; isPinned: boolean }) => update(id, { is_pinned: isPinned }),
  invalidateKeys: [photoKeys.all],
  optimisticUpdate: async ({ id, isPinned }: { id: string; isPinned: boolean }, queryClient: any) => {
    await queryClient.cancelQueries({ queryKey: photoKeys.all });
    const previousData = queryClient.getQueryData(photoKeys.all);

    queryClient.setQueriesData({ queryKey: photoKeys.all }, (old: any) => {
      if (!old || !old.pages) return old;
      return {
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          photos: page.photos.map((p: Photo) => 
            p.id === id ? { ...p, is_pinned: isPinned } : p
          ),
        })),
      };
    });

    return { previousData };
  },
  rollback: (_err: any, _vars: any, context: any, queryClient: any) => {
    if (context?.previousData) {
      queryClient.setQueriesData({ queryKey: photoKeys.all }, context.previousData);
    }
  },
  onSuccessMessage: (data: any, { isPinned }: { isPinned: boolean }) => isPinned ? '已置顶' : '已取消置顶',
});

export const useUploadPhotos = createMutationHook({
  entity: 'Photo',
  action: 'Upload',
  mutationFn: async ({ userId, photoId, base64Data, onProgress }: { userId: string; photoId: string; base64Data: string; onProgress: (p: number) => void }) => 
    uploadImages(userId, photoId, base64Data, undefined, undefined, onProgress),
  invalidateKeys: [photoKeys.all],
  onSuccessMessage: '上传完成',
});

/**
 * Hook for complex photo domain mutations that require custom logic
 */
export const usePhotoMutations = () => {
  const edit = usePhotoEdit();
  const remove = usePhotoDelete();
  const batchEdit = usePhotoBatchEdit();
  const togglePin = useTogglePin();
  const upload = useUploadPhotos();

  return {
    edit,
    remove,
    batchEdit,
    togglePin,
    upload,
  };
};
