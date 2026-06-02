import { createMutationHook } from './factory';
import { Photo } from '@/types';
import { update, deleteMany, batchUpdate } from '@/services/photo/commands';
import { photoKeys } from '@/lib/queryKeys';

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
  onSuccessMessage: '照片已删除',
});

export const usePhotoBatchEdit = createMutationHook({
  entity: 'Photo',
  action: 'BatchUpdate',
  mutationFn: ({ ids, updates }: { ids: string[]; updates: Partial<Photo> }) => batchUpdate(ids, updates),
  invalidateKeys: [photoKeys.all],
  onSuccessMessage: '批量更新成功',
});

export const useTogglePin = createMutationHook({
  entity: 'Photo',
  action: 'TogglePin',
  mutationFn: ({ id, isPinned }: { id: string; isPinned: boolean }) => update(id, { is_pinned: isPinned }),
  invalidateKeys: [photoKeys.all],
  onSuccessMessage: (data, { isPinned }) => isPinned ? '已置顶' : '已取消置顶',
});

/**
 * Hook for complex photo domain mutations that require custom logic
 */
export const usePhotoMutations = () => {
  const edit = usePhotoEdit();
  const remove = usePhotoDelete();
  const batchEdit = usePhotoBatchEdit();
  const togglePin = useTogglePin();

  return {
    edit,
    remove,
    batchEdit,
    togglePin,
  };
};
