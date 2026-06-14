import { Category } from '@/types';
import { addCategoryToDB, updateCategoryInDB, deleteCategoryFromDB } from '@/services/category/commands';
import { queryKeys } from '@/lib/query/keys';
import { defineMutation } from '@/lib/mutations/defineMutation';
import { useAppMutation } from '@/lib/mutations/useAppMutation';

const categoryCreateConfig = defineMutation<Category, string | Partial<Category>>({
  name: 'categoryCreate',
  service: async (variables) => {
    const name = typeof variables === 'string' ? variables : (variables.name || '');
    const res = await addCategoryToDB(name);
    if (!res) throw new Error('分类创建失败');
    return res;
  },
  invalidate: () => [queryKeys.categories.categories() as any, queryKeys.photos.all as any],
  successMessage: '分类添加成功',
});
export const useCategoryCreate = () => useAppMutation(categoryCreateConfig);

const categoryEditConfig = defineMutation<boolean, { id: string; updates: Partial<Category> }>({
  name: 'categoryEdit',
  service: async ({ id, updates }) => {
    const res = await updateCategoryInDB(id, updates);
    if (!res) throw new Error('分类更新失败');
    return true;
  },
  invalidate: () => [queryKeys.categories.categories() as any, queryKeys.photos.all as any],
  successMessage: '分类更新成功',
});
export const useCategoryEdit = () => useAppMutation(categoryEditConfig);

const categoryDeleteConfig = defineMutation<boolean, string>({
  name: 'categoryDelete',
  service: async (id: string) => {
    const res = await deleteCategoryFromDB(id);
    if (!res) throw new Error('分类删除失败');
    return true;
  },
  invalidate: () => [queryKeys.categories.categories() as any, queryKeys.photos.all as any],
  successMessage: '分类删除成功',
});
export const useCategoryDelete = () => useAppMutation(categoryDeleteConfig);
