import { createMutationHook } from './factory';
import { deleteCategoryFromDB } from '@/services/category/commands';
import { photoKeys } from '@/lib/queryKeys';

export const useCategoryDelete = createMutationHook({
  entity: 'Category',
  action: 'Delete',
  mutationFn: deleteCategoryFromDB,
  invalidateKeys: [photoKeys.categories()],
  onSuccessMessage: '分类删除成功',
});
