import { Tag } from '#src/types/index.js';
import { addTagToDB, updateTagInDB, deleteTagFromDB } from '#src/services/tag/commands.js';
import { queryKeys } from '#lib/query/keys.js';
import { useAppMutation, queryClient } from '#lib/query/index.js';

// 1. 创建标签
export const useTagCreate = () => useAppMutation({
  mutationFn: async (variables: string | Partial<Tag>) => {
    const name = typeof variables === 'string' ? variables : (variables.name || '');
    const res = await addTagToDB(name);
    if (!res || (typeof res === 'object' && 'ok' in res && !res.ok)) {
      throw new Error('标签创建失败');
    }
    return res as Tag;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.photos.all });
  }
});

// 2. 编辑标签
export const useTagEdit = () => useAppMutation({
  mutationFn: async ({ id, updates }: { id: number; updates: Partial<Tag> }) => {
    const res = await updateTagInDB(id, updates);
    if (!res) throw new Error('标签更新失败');
    return true;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.photos.all });
  }
});

// 3. 删除标签
export const useTagDelete = () => useAppMutation({
  mutationFn: async (id: number) => {
    const res = await deleteTagFromDB(id);
    if (!res) throw new Error('标签删除失败');
    return true;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.photos.all });
  }
});
