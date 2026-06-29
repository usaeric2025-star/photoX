import { Photo } from '@/types';
import { updatePhoto as update, BatchActionResult, deleteMany, batchUpdate } from '@/services/photo/commands';
import { queryKeys } from '@/lib/query/keys';
import { useAppMutation, appQuery } from '@/lib/query';
import { syncBatchPhotoTags } from '@/services/tag/commands';
import { showToast } from '@/lib/ui/toast';
import { useSelectionActions } from '@/features/selection';
import { ErrorFactory } from '@/lib/error/ErrorFactory';

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
  onSuccess: () => {
    showToast.success('照片已更新');
    appQuery.mutate((key) => {
      if (!key) return false;
      const keyStr = typeof key === 'string' ? key : JSON.stringify(key);
      return keyStr.includes('photos') || keyStr.includes('groups') || keyStr.includes('storage') || keyStr.includes('ai-audit');
    });
  },
  onError: (err) => {
    ErrorFactory.handle(err, { context: '照片更新' });
  }
});

// 2. 照片删除
export const usePhotoDelete = () => {
  const { clearSelection } = useSelectionActions();
  
  return useAppMutation({
    mutationFn: async (ids: string | string[]) => {
      return await deleteMany(Array.isArray(ids) ? ids : [ids]);
    },
    onSuccess: () => {
      showToast.success('照片已刪除');
      clearSelection();
      
      // 廣泛刷新緩存，考慮到 SWR Infinite 的 key 可能被序列化成 $inf$... 字串
      appQuery.mutate((key) => {
        if (!key) return false;
        const keyStr = typeof key === 'string' ? key : JSON.stringify(key);
        return keyStr.includes('photos') || keyStr.includes('groups') || keyStr.includes('storage') || keyStr.includes('ai-audit');
      });
    },
    onError: (err) => {
      ErrorFactory.handle(err, { context: '照片删除' });
    }
  });
};

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
  onSuccess: (res) => {
    showToast.success(`成功更新 ${Array.isArray(res) ? res.length : ''} 張照片`);
    appQuery.mutate((key) => {
      if (!key) return false;
      const keyStr = typeof key === 'string' ? key : JSON.stringify(key);
      return keyStr.includes('photos') || keyStr.includes('groups') || keyStr.includes('storage') || keyStr.includes('ai-audit');
    });
  },
  onError: (err) => {
    ErrorFactory.handle(err, { context: '批量更新照片' });
  }
});

// 4. 钉选/取消钉选
export const useTogglePin = () => useAppMutation({
  mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
    const res = await update(id, { is_pinned: isPinned });
    if (!res) throw new Error('Failed to update photo');
    return res;
  },
  onSuccess: (_, { isPinned }) => {
    showToast.success(isPinned ? '已置頂' : '已取消置頂');
    appQuery.mutate((key) => {
      if (!key) return false;
      const keyStr = typeof key === 'string' ? key : JSON.stringify(key);
      return keyStr.includes('photos') || keyStr.includes('groups') || keyStr.includes('storage') || keyStr.includes('ai-audit');
    });
  },
  onError: (err) => {
    ErrorFactory.handle(err, { context: '操作' });
  }
});


