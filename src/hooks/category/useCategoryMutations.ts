import { Category } from '#src/types/index.js';
import { createCategory, updateCategory, deleteCategory } from '#src/services/category/commands.js';
import { queryKeys } from '#lib/query/keys.js';
import { useAppMutation, queryClient } from '#lib/query/index.js';

export const useCategoryCreate = () => useAppMutation({
  mutationFn: async (variables: string | Partial<Category>) => {
    const name = typeof variables === 'string' ? variables : (variables.name || '');
    const res = await createCategory({ name });
    if (!res) throw new Error('分类创建失败');
    return res;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.photos.all });
  }
});

export const useCategoryEdit = () => useAppMutation({
  mutationFn: async ({ id, updates }: { id: number; updates: Partial<Category> }) => {
    await updateCategory(id, updates);
    return true;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.photos.all });
  }
});

export const useCategoryDelete = () => useAppMutation({
  mutationFn: async (id: number) => {
    await deleteCategory(id);
    return true;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.photos.all });
  }
});
