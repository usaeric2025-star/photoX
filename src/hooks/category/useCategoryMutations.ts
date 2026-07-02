import { Category } from '#src/types/index.js';
import { createCategory, updateCategory, deleteCategory } from '#src/services/category/commands.js';
import { queryKeys } from '#lib/query/keys.js';
import { useAppMutation, appQuery } from '#lib/query/index.js';

export const useCategoryCreate = () => useAppMutation({
  mutationFn: async (variables: string | Partial<Category>) => {
    const name = typeof variables === 'string' ? variables : (variables.name || '');
    const res = await createCategory({ name });
    if (!res) throw new Error('分类创建失败');
    return res;
  },
  onSuccess: () => {
    appQuery.mutate(queryKeys.categories.all);
    appQuery.mutate((key) => {
      if (!key) return false;
      const keyStr = typeof key === 'string' ? key : JSON.stringify(key);
      return keyStr.includes('photos');
    });
  }
});

export const useCategoryEdit = () => useAppMutation({
  mutationFn: async ({ id, updates }: { id: number; updates: Partial<Category> }) => {
    await updateCategory(id, updates);
    return true;
  },
  onSuccess: () => {
    appQuery.mutate(queryKeys.categories.all);
    appQuery.mutate((key) => {
      if (!key) return false;
      const keyStr = typeof key === 'string' ? key : JSON.stringify(key);
      return keyStr.includes('photos');
    });
  }
});

export const useCategoryDelete = () => useAppMutation({
  mutationFn: async (id: number) => {
    await deleteCategory(id);
    return true;
  },
  onSuccess: () => {
    appQuery.mutate(queryKeys.categories.all);
    appQuery.mutate((key) => {
      if (!key) return false;
      const keyStr = typeof key === 'string' ? key : JSON.stringify(key);
      return keyStr.includes('photos');
    });
  }
});

/**
 * Combined hook for batch usage or specific components
 */
function useCategoryMutations() {
  const create = useCategoryCreate();
  const update = useCategoryEdit();
  const remove = useCategoryDelete();

  return {
    create: create.mutateAsync,
    update: update.mutateAsync,
    remove: remove.mutateAsync,
    isMutating: create.isPending || update.isPending || remove.isPending,
  };
}
