import { createMutationHook, optimistic } from '../core/mutationFactory';
import { Photo } from '@/types';
import { update, deleteMany, batchUpdate } from '@/services/photo/commands';
import { photoKeys } from '@/lib/queryKeys';
import { ErrorFactory } from '@/lib/error/ErrorFactory';

/**
 * 照片编辑 Mutation
 */
export const usePhotoEditMutation = createMutationHook({
  entity: 'Photo',
  action: 'Update',
  mutationFn: async ({ id, updates }: { id: string; updates: Partial<Photo>; silent?: boolean }) => {
    const { tags, ...coreUpdates } = updates;
    const res = await update(id, coreUpdates as any);
    if (!res.ok) throw new Error(res.message);
    
    if (tags && Array.isArray(tags)) {
      const { syncBatchPhotoTags } = await import('@/services/tag/commands');
      await syncBatchPhotoTags([id], tags.map(t => String(t.id)));
    }
    
    return res.data;
  },
  invalidateKeys: (vars: { id: string; updates: Partial<Photo>; silent?: boolean }) => [photoKeys.all, ['photo', vars.id]],
  optimisticUpdate: (old: any, { id, updates }: { id: string; updates: Partial<Photo> }) => {
    if (!old) return old;
    // Infinite list query data structure
    if (old.pages) {
      return optimistic.infinite.update<Photo>()(old, { id, updates: updates as any });
    }
    // Single details query cache structure
    if (old.id === id) {
      return { ...old, ...updates };
    }
    return old;
  },
  onSuccessMessage: (data: any, vars: any) => {
    if (vars?.silent) return null;
    return '已更新';
  },
});

/**
 * 照片删除 Mutation
 */
export const usePhotoDelete = createMutationHook({
  entity: 'Photo',
  action: 'Delete',
  mutationFn: async (ids: string | string[]) => {
    const res = await deleteMany(Array.isArray(ids) ? ids : [ids]);
    if (!res.ok) throw new Error(res.message);
    return res.data;
  },
  invalidateKeys: (vars: string | string[]) => [
    photoKeys.all,
    ...((Array.isArray(vars) ? vars : [vars]).map((id: string) => ['photo', id]))
  ],
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
    const { tags, ...coreUpdates } = updates;
    const res = await batchUpdate(ids, coreUpdates as any);
    if (!res.ok) throw new Error(res.message);
    
    if (tags && Array.isArray(tags)) {
      const { syncBatchPhotoTags } = await import('@/services/tag/commands');
      await syncBatchPhotoTags(ids, tags.map(t => String(t.id)));
    }
    
    return res.data;
  },
  invalidateKeys: (vars: { ids: string[]; updates: Partial<Photo> }) => [
    photoKeys.all,
    ...((Array.isArray(vars.ids) ? vars.ids : [vars.ids]).map((id: string) => ['photo', id]))
  ],
  onSuccessMessage: (data: any, vars: any) => {
    if (vars?.silent) return null;
    if (data && typeof data === 'object' && 'successCount' in data) {
      if (data.failureCount > 0) {
        return `批量操作：成功 ${data.successCount}, 失败 ${data.failureCount}`;
      }
      return `批量操作完成 (${data.successCount})`;
    }
    return '已更新';
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
    if (!res.ok) throw new Error(res.message);
    return res.data;
  },
  invalidateKeys: (vars: { id: string; isPinned: boolean }) => [photoKeys.all, ['photo', vars.id]],
  optimisticUpdate: (old: any, { id, isPinned }: { id: string; isPinned: boolean }) => 
    optimistic.infinite.update<Photo>()(old, { id, updates: { is_pinned: isPinned } as any }),
  onSuccessMessage: (data: any, { isPinned }: { isPinned: boolean }) => isPinned ? '已置顶' : '已入库',
});
