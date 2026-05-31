import { createMutationHook } from './factory';
import { addCategoryToDB } from '@/services/category/commands';
import { photoKeys } from '@/lib/queryKeys';

export const useCategoryCreate = createMutationHook({
  entity: 'Category',
  action: 'Add',
  mutationFn: addCategoryToDB,
  invalidateKeys: [photoKeys.categories()],
  onSuccessMessage: '分类添加成功',
});
