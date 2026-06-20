import { optimistic } from '@/lib/query/mutationFactory';
import { Photo } from '@/types';
import { updatePhoto as update } from '@/services/photo/commands/update';
import { BatchActionResult, deleteMany, batchUpdate } from '@/services/photo/commands/batch';
import { queryKeys } from '@/lib/query/keys';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { defineMutation } from '@/lib/mutations/defineMutation';
import { useOptimisticMutation } from '@/lib/mutations/useOptimisticMutation';
import { QueryKey } from '@tanstack/react-query';

/**
 * 照片编辑 Mutation
 */
// 1. 照片编辑
const photoEditConfig = defineMutation<
  Photo,
  { id: string; updates: Partial<Photo>; silent?: boolean },
  readonly unknown[]
>({
  name: 'photoEdit',
  service: async ({ id, updates }) => {
    const { tags, ...coreUpdates } = updates;
    const res = await update(id, coreUpdates as Partial<Photo>);
    
    if (tags && Array.isArray(tags)) {
      const { syncBatchPhotoTags } = await import('@/services/tag/commands');
      const tagIds = tags.map(t => typeof t === 'object' && t !== null ? String((t as any).id) : String(t)).filter(Boolean);
      const tagSources: Record<string, "user"> = {};
      tagIds.forEach(tId => {
        tagSources[tId] = "user";
      });
      await syncBatchPhotoTags([id], tagIds, undefined, tagSources);
    }
    
    return res as Photo;
  },
  invalidate: (data, vars) => [queryKeys.photos.all, queryKeys.groups.all, queryKeys.photos.detail(vars.id)],
  cleanupKey: (vars) => vars.id,
  optimistic: (old, { id, updates }) => {
    const castOld = old as { pages: { photos?: Photo[]; items?: Photo[] }[] } | Photo | undefined;
    if (!castOld) return castOld;
    if ('pages' in castOld) return optimistic.infinite.update<Photo>()(castOld as { pages: { photos?: Photo[]; items?: Photo[] }[] }, { id, updates });
    if ((castOld as Photo).id === id) return { ...(castOld as Photo), ...updates };
    return castOld;
  },
  successMessage: '已更新',
});

export const usePhotoEditMutation = () => useOptimisticMutation(photoEditConfig);

// 2. 照片删除
const photoDeleteConfig = defineMutation<
  BatchActionResult,
  string | string[],
  readonly unknown[]
>({
  name: 'photoDelete',
  service: async (ids) => {
    return await deleteMany(Array.isArray(ids) ? ids : [ids]);
  },
  invalidate: (data, vars) => [
    queryKeys.photos.all,
    queryKeys.groups.all,
    ...(Array.isArray(vars) ? vars : [vars]).map((id) => queryKeys.photos.detail(id))
  ],
  successMessage: '照片已删除',
});

export const usePhotoDelete = () => useOptimisticMutation(photoDeleteConfig);

// 3. 批量编辑
const photoBatchEditConfig = defineMutation<
  BatchActionResult,
  { ids: string[]; updates: Partial<Photo> },
  readonly unknown[]
>({
  name: 'photoBatchEdit',
  service: async ({ ids, updates }) => {
    const { tags, ...coreUpdates } = updates;
    const res = await batchUpdate(ids, coreUpdates as Partial<Photo>);
    
    if (tags && Array.isArray(tags)) {
      const { syncBatchPhotoTags } = await import('@/services/tag/commands');
      const tagIds = (tags as { id: string | number }[]).filter(t => t && t.id).map(t => String(t.id));
      const tagSources: Record<string, "user"> = {};
      tagIds.forEach(tId => {
        tagSources[tId] = "user";
      });
      await syncBatchPhotoTags(ids, tagIds, undefined, tagSources);
    }
    
    return res;
  },
  invalidate: (data, vars) => [
    queryKeys.photos.all,
    queryKeys.groups.all,
    ...vars.ids.map((id) => queryKeys.photos.detail(id))
  ],
  successMessage: '批量操作完成',
});

export const usePhotoBatchEdit = () => useOptimisticMutation(photoBatchEditConfig);

// 4. 钉选/取消钉选
const togglePinConfig = defineMutation<
  Photo,
  { id: string; isPinned: boolean },
  readonly unknown[]
>({
  name: 'togglePin',
  service: async ({ id, isPinned }) => {
    const res = await update(id, { is_pinned: isPinned });
    if (!res) throw new Error('Failed to update photo');
    return res;
  },
  cleanupKey: (vars) => vars.id,
  invalidate: (data, vars) => [queryKeys.photos.all, queryKeys.groups.all, queryKeys.photos.detail(vars.id)],
  optimistic: (old, { id, isPinned }) => {
    const castOld = old as { pages: { photos?: Photo[]; items?: Photo[] }[] } | Photo | undefined;
    if (!castOld) return castOld;
    if ('pages' in castOld) {
        return optimistic.infinite.update<Photo>()(castOld as { pages: { photos?: Photo[]; items?: Photo[] }[] }, { id, updates: { is_pinned: isPinned } });
    }
    // If it's a detail query, castOld should be a Photo
    if ((castOld as Photo).id === id) {
        return { ...(castOld as Photo), is_pinned: isPinned };
    }
    return castOld;
  },
  successMessage: '状态已更新',
});

export const useTogglePin = () => useOptimisticMutation(togglePinConfig);

