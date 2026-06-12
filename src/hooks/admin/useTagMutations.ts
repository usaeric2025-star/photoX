import { Tag } from '@/types';
import { addTagToDB, updateTagInDB, deleteTagFromDB } from '@/services/tag/commands';
import { tagKeys, photoKeys } from '@/lib/queryKeys';
import { defineMutation } from '@/lib/mutations/defineMutation';
import { useAppMutation } from '@/lib/mutations/useAppMutation';

const tagCreateConfig = defineMutation<Tag, string | Partial<Tag>>({
  service: async (variables) => {
    const name = typeof variables === 'string' ? variables : (variables.name || '');
    const res = await addTagToDB(name);
    if (!res) throw new Error('标签创建失败');
    return res;
  },
  invalidate: () => [tagKeys.tags() as any, photoKeys.all as any],
  successMessage: '标签添加成功',
});
export const useTagCreate = () => useAppMutation(tagCreateConfig);

const tagEditConfig = defineMutation<boolean, { id: string; updates: Partial<Tag> }>({
  service: async ({ id, updates }) => {
    const res = await updateTagInDB(id, updates);
    if (!res) throw new Error('标签更新失败');
    return true;
  },
  invalidate: () => [tagKeys.tags() as any, photoKeys.all as any],
  successMessage: '标签更新成功',
});
export const useTagEdit = () => useAppMutation(tagEditConfig);

const tagDeleteConfig = defineMutation<boolean, string>({
  service: async (id: string) => {
    const res = await deleteTagFromDB(id);
    if (!res) throw new Error('标签删除失败');
    return true;
  },
  invalidate: () => [tagKeys.tags() as any, photoKeys.all as any],
  successMessage: '标签删除成功',
});
export const useTagDelete = () => useAppMutation(tagDeleteConfig);
