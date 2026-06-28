import { Category } from '@/types';
import { addCategoryToDB, updateCategoryInDB, deleteCategoryFromDB } from '@/services/category/commands';
import { queryKeys } from '@/lib/query/keys';
import { useAppMutation, appQuery } from '@/lib/query';

export const useCategoryCreate = () => useAppMutation({
  mutationFn: async (variables: string | Partial<Category>) => {
    const name = typeof variables === 'string' ? variables : (variables.name || '');
    const res = await addCategoryToDB(name);
    if (!res) throw new Error('分类创建失败');
    return res;
  },
  onSuccess: () => {
    appQuery.mutate(queryKeys.categories.all);
    appQuery.mutate(queryKeys.photos.all);
  }
});

export const useCategoryEdit = () => useAppMutation({
  mutationFn: async ({ id, updates }: { id: number; updates: Partial<Category> }) => {
    const res = await updateCategoryInDB(id, updates);
    if (!res) throw new Error('分类更新失败');
    return true;
  },
  onSuccess: () => {
    appQuery.mutate(queryKeys.categories.all);
    appQuery.mutate(queryKeys.photos.all);
  }
});

export const useCategoryDelete = () => useAppMutation({
  mutationFn: async (id: number) => {
    const res = await deleteCategoryFromDB(id);
    if (!res) throw new Error('分类删除失败');
    return true;
  },
  onSuccess: () => {
    appQuery.mutate(queryKeys.categories.all);
    appQuery.mutate(queryKeys.photos.all);
  }
});

