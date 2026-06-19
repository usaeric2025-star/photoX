import { Tag } from '@/types';
import { addTagToDB, updateTagInDB, deleteTagFromDB } from '@/services/tag/commands';
import { queryKeys } from '@/lib/query/keys';
import { defineMutation } from '@/lib/mutations/defineMutation';
import { useOptimisticMutation } from '@/lib/mutations/useOptimisticMutation';

// 1. 创建标签
const tagCreateConfig = defineMutation<Tag, string | Partial<Tag>, readonly unknown[]>({
  name: 'tagCreate',
  service: async (variables) => {
    const name = typeof variables === 'string' ? variables : (variables.name || '');
    const res = await addTagToDB(name);
    if (!res || (typeof res === 'object' && 'ok' in res && !res.ok)) {
      throw new Error('标签创建失败');
    }
    return res as Tag;
  },
  invalidate: () => [queryKeys.tags.all, queryKeys.photos.all],
  successMessage: '标签添加成功',
});
export const useTagCreate = () => useOptimisticMutation(tagCreateConfig);

// 2. 编辑标签
const tagEditConfig = defineMutation<boolean, { id: string; updates: Partial<Tag> }, readonly unknown[]>({
  name: 'tagEdit',
  service: async ({ id, updates }) => {
    const res = await updateTagInDB(id, updates);
    if (!res) throw new Error('标签更新失败');
    return true;
  },
  invalidate: () => [queryKeys.tags.all, queryKeys.photos.all],
  successMessage: '标签更新成功',
});
export const useTagEdit = () => useOptimisticMutation(tagEditConfig);

// 3. 删除标签
const tagDeleteConfig = defineMutation<boolean, string, readonly unknown[]>({
  name: 'tagDelete',
  service: async (id) => {
    const res = await deleteTagFromDB(id);
    if (!res) throw new Error('标签删除失败');
    return true;
  },
  invalidate: () => [queryKeys.tags.all, queryKeys.photos.all],
  successMessage: '标签删除成功',
});
export const useTagDelete = () => useOptimisticMutation(tagDeleteConfig);

