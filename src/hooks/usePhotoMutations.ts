import { createMutationHook, optimistic } from './core/mutationFactory';
import { Photo } from '../types';
import { update, deleteMany, batchUpdate } from '@/services/photo/commands';
import { photoKeys } from '@/lib/queryKeys';
import { ErrorFactory } from '@/lib/error/ErrorFactory';

/**
 * 照片编辑 Mutation
 */
export const usePhotoEditMutation = createMutationHook({
  entity: 'Photo',
  action: 'Update',
  mutationFn: async ({ id, updates }: { id: string; updates: Partial<Photo> }) => {
    const res = await update(id, updates);
    if (!res.ok) throw ErrorFactory.wrap(new Error(res.message), 'Update Photo', id);
    return res.data;
  },
  invalidateKeys: (vars) => [photoKeys.all, ['photo', vars.id]],
  onSuccessMessage: '照片更新成功',
});

/**
 * 照片删除 Mutation
 */
export const usePhotoDelete = createMutationHook({
  entity: 'Photo',
  action: 'Delete',
  mutationFn: async (ids: string | string[]) => {
    const res = await deleteMany(Array.isArray(ids) ? ids : [ids]);
    if (!res.ok) throw ErrorFactory.wrap(new Error(res.message), 'Delete Photos');
    return res.data;
  },
  invalidateKeys: (vars) => [photoKeys.all, ...((Array.isArray(vars) ? vars : [vars]).map(id => ['photo', id]))],
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

/**
 * 照片批量编辑 Mutation
 */
export const usePhotoBatchEdit = createMutationHook({
  entity: 'Photo',
  action: 'BatchUpdate',
  mutationFn: async ({ ids, updates }: { ids: string[]; updates: Partial<Photo> }) => {
    const res = await batchUpdate(ids, updates);
    if (!res.ok) throw ErrorFactory.wrap(new Error(res.message), 'Batch Update Photos', ids.join(','));
    return res.data;
  },
  invalidateKeys: (vars) => [photoKeys.all, ...((Array.isArray(vars.ids) ? vars.ids : [vars.ids]).map(id => ['photo', id]))],
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

/**
 * 照片置顶状态切换 Mutation
 */
export const useTogglePin = createMutationHook({
  entity: 'Photo',
  action: 'TogglePin',
  mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
    const res = await update(id, { is_pinned: isPinned });
    if (!res.ok) throw ErrorFactory.wrap(new Error(res.message), 'Toggle Pin Photo', id);
    return res.data;
  },
  invalidateKeys: (vars) => [photoKeys.all, ['photo', vars.id]],
  optimisticUpdate: (old: any, { id, isPinned }: { id: string; isPinned: boolean }) => 
    optimistic.infinite.update<Photo>()(old, { id, updates: { is_pinned: isPinned } as any }),
  onSuccessMessage: (data: any, { isPinned }: { isPinned: boolean }) => isPinned ? '已置顶' : '已取消置顶',
});
