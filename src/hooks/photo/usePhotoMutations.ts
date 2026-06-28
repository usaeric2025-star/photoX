import { Photo } from '@/types';
import { updatePhoto as update, BatchActionResult, deleteMany, batchUpdate } from '@/services/photo/commands';
import { queryKeys } from '@/lib/query/keys';
import { useAppMutation } from '@/lib/query';
import { syncBatchPhotoTags } from '@/services/tag/commands';

/**
 * 照片编辑 Mutation
 */
// 1. 照片编辑
export const usePhotoEditMutation = () => useAppMutation({
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
});

// 2. 照片删除
export const usePhotoDelete = () => useAppMutation({
  mutationFn: async (ids: string | string[]) => {
    return await deleteMany(Array.isArray(ids) ? ids : [ids]);
  },
});

// 3. 批量编辑
export const usePhotoBatchEdit = () => useAppMutation({
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
});

// 4. 钉选/取消钉选
export const useTogglePin = () => useAppMutation({
  mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
    const res = await update(id, { is_pinned: isPinned });
    if (!res) throw new Error('Failed to update photo');
    return res;
  },
});


