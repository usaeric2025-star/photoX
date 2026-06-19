import { Category } from '@/types';
import { addCategoryToDB, updateCategoryInDB, deleteCategoryFromDB } from '@/services/category/commands';
import { queryKeys } from '@/lib/query/keys';
import { defineMutation } from '@/lib/mutations/defineMutation';
import { useOptimisticMutation } from '@/lib/mutations/useOptimisticMutation';

const categoryCreateConfig = defineMutation<Category, string | Partial<Category>, readonly unknown[]>({
  name: 'categoryCreate',
  service: async (variables) => {
    const name = typeof variables === 'string' ? variables : (variables.name || '');
    const res = await addCategoryToDB(name);
    if (!res) throw new Error('分类创建失败');
    return res;
  },
  invalidate: () => [queryKeys.categories.all, queryKeys.photos.all],
  successMessage: '分类添加成功',
});
export const useCategoryCreate = () => useOptimisticMutation(categoryCreateConfig);

const categoryEditConfig = defineMutation<boolean, { id: string; updates: Partial<Category> }, readonly unknown[]>({
  name: 'categoryEdit',
  service: async ({ id, updates }) => {
    const res = await updateCategoryInDB(id, updates);
    if (!res) throw new Error('分类更新失败');
    return true;
  },
  invalidate: () => [queryKeys.categories.all, queryKeys.photos.all],
  successMessage: '分类更新成功',
});
export const useCategoryEdit = () => useOptimisticMutation(categoryEditConfig);

const categoryDeleteConfig = defineMutation<boolean, string, readonly unknown[]>({
  name: 'categoryDelete',
  service: async (id) => {
    const res = await deleteCategoryFromDB(id);
    if (!res) throw new Error('分类删除失败');
    return true;
  },
  invalidate: () => [queryKeys.categories.all, queryKeys.photos.all],
  successMessage: '分类删除成功',
});
export const useCategoryDelete = () => useOptimisticMutation(categoryDeleteConfig);

