import { createMutationHook } from './factory';
import { Category } from '@/types';
import { updateCategoryInDB } from '@/services/category/commands';
import { photoKeys } from '@/lib/queryKeys';

export const useCategoryEdit = createMutationHook({
  entity: 'Category',
  action: 'Update',
  mutationFn: ({ id, updates }: { id: string; updates: Partial<Category> }) => updateCategoryInDB(id, updates),
  invalidateKeys: [photoKeys.categories()],
  onSuccessMessage: '分类更新成功',
});
