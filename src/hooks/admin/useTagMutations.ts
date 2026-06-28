import { Tag } from '@/types';
import { addTagToDB, updateTagInDB, deleteTagFromDB } from '@/services/tag/commands';
import { queryKeys } from '@/lib/query/keys';
import { useAppMutation, appQuery } from '@/lib/query';

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
    appQuery.mutate(queryKeys.tags.all);
    appQuery.mutate(queryKeys.photos.all);
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
    appQuery.mutate(queryKeys.tags.all);
    appQuery.mutate(queryKeys.photos.all);
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
    appQuery.mutate(queryKeys.tags.all);
    appQuery.mutate(queryKeys.photos.all);
  }
});

