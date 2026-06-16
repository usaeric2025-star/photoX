import { optimistic } from '@/lib/query/mutationFactory';
import { Photo } from '@/types';
import { updatePhoto as update } from '@/services/photo/commands/update';
import { deleteMany, batchUpdate } from '@/services/photo/commands/batch';
import { queryKeys } from '@/lib/query/keys';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { defineMutation } from '@/lib/mutations/defineMutation';
import { useAppMutation } from '@/lib/mutations/useAppMutation';

/**
 * 照片编辑 Mutation
 */
const photoEditConfig = defineMutation<Photo, { id: string; updates: Partial<Photo>; silent?: boolean }>({
  name: 'photoEdit',
  service: async ({ id, updates }) => {
    const { tags, ...coreUpdates } = updates;
    const res = await update(id, coreUpdates as any);
    
    if (tags && Array.isArray(tags)) {
      const { syncBatchPhotoTags } = await import('@/services/tag/commands');
      const tagIds = tags.filter(t => t && t.id).map(t => String(t.id));
      const tagSources: Record<string, "user"> = {};
      tagIds.forEach(tId => {
        tagSources[tId] = "user";
      });
      await syncBatchPhotoTags([id], tagIds, undefined, tagSources);
    }
    
    return res;
  },
  invalidate: (data, vars) => [queryKeys.photos.all as any, queryKeys.groups.all as any, queryKeys.photos.detail(vars.id) as any],
  cleanupKey: (vars) => vars.id,
  optimistic: (old: any, { id, updates }: { id: string; updates: Partial<Photo> }) => {
    if (!old) return old;
    if (old.pages) return optimistic.infinite.update<Photo>()(old, { id, updates: updates as any });
    if (old.id === id) return { ...old, ...updates };
    return old;
  },
  successMessage: '已更新',
});

export const usePhotoEditMutation = () => useAppMutation(photoEditConfig);

const photoDeleteConfig = defineMutation<any, string | string[]>({
  name: 'photoDelete',
  service: async (ids) => {
    const res = await deleteMany(Array.isArray(ids) ? ids : [ids]);
    return res;
  },
  invalidate: (data, vars) => [
    queryKeys.photos.all as any,
    queryKeys.groups.all as any,
    ...((Array.isArray(vars) ? vars : [vars]).map((id: string) => queryKeys.photos.detail(id) as any))
  ],
  successMessage: '照片已删除',
});

export const usePhotoDelete = () => useAppMutation(photoDeleteConfig);

const photoBatchEditConfig = defineMutation<any, { ids: string[]; updates: Partial<Photo> }>({
  name: 'photoBatchEdit',
  service: async ({ ids, updates }) => {
    const { tags, ...coreUpdates } = updates;
    const res = await batchUpdate(ids, coreUpdates as any);
    
    if (tags && Array.isArray(tags)) {
      const { syncBatchPhotoTags } = await import('@/services/tag/commands');
      const tagIds = tags.filter(t => t && t.id).map(t => String(t.id));
      const tagSources: Record<string, "user"> = {};
      tagIds.forEach(tId => {
        tagSources[tId] = "user";
      });
      await syncBatchPhotoTags(ids, tagIds, undefined, tagSources);
    }
    
    return res;
  },
  invalidate: (data, vars) => [
    queryKeys.photos.all as any,
    queryKeys.groups.all as any,
    ...((Array.isArray(vars.ids) ? vars.ids : [vars.ids]).map((id: string) => queryKeys.photos.detail(id) as any))
  ],
  successMessage: '批量操作完成',
});

export const usePhotoBatchEdit = () => useAppMutation(photoBatchEditConfig);

const togglePinConfig = defineMutation<any, { id: string; isPinned: boolean }>({
  name: 'togglePin',
  service: async ({ id, isPinned }) => {
    const res = await update(id, { is_pinned: isPinned });
    return res;
  },
  cleanupKey: (vars) => vars.id,
  invalidate: (data, vars) => [queryKeys.photos.all as any, queryKeys.groups.all as any, queryKeys.photos.detail(vars.id) as any],
  optimistic: (old: any, { id, isPinned }: { id: string; isPinned: boolean }) => 
    optimistic.infinite.update<Photo>()(old, { id, updates: { is_pinned: isPinned } as any }),
  successMessage: '状态已更新',
});

export const useTogglePin = () => useAppMutation(togglePinConfig);
