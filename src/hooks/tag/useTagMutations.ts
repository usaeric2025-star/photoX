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
    appQuery.mutate((key) => {
      if (!key) return false;
      const keyStr = typeof key === 'string' ? key : JSON.stringify(key);
      return keyStr.includes('photos');
    });
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
    appQuery.mutate((key) => {
      if (!key) return false;
      const keyStr = typeof key === 'string' ? key : JSON.stringify(key);
      return keyStr.includes('photos');
    });
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
    appQuery.mutate((key) => {
      if (!key) return false;
      const keyStr = typeof key === 'string' ? key : JSON.stringify(key);
      return keyStr.includes('photos');
    });
  }
});

/**
 * Combined hook for backward compatibility or bulk usage
 */
function useTagMutations() {
  const create = useTagCreate();
  const update = useTagEdit();
  const remove = useTagDelete();

  return {
    add: create.mutateAsync,
    update: update.mutateAsync,
    remove: remove.mutateAsync,
    isMutating: create.isPending || update.isPending || remove.isPending,
  };
}
