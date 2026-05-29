import { createMutationHook } from './factory';
import { Tag, Category, Manufacturer } from '@/types';
import { addTagToDB, updateTagInDB, deleteTagFromDB } from '@/services/tags';
import { addCategoryToDB, updateCategoryInDB, deleteCategoryFromDB } from '@/services/categories';
import { addManufacturerToDB, updateManufacturerInDB, deleteManufacturerFromDB } from '@/services/manufacturers';
import { photoKeys } from '@/lib/queryKeys';

export const useAddTagMutation = createMutationHook({
  entity: 'Tag', 
  action: 'Add',
  mutationFn: addTagToDB,
  invalidateKeys: [photoKeys.tags()],
  onSuccessMessage: '标签添加成功',
});

export const useUpdateTagMutation = createMutationHook({
  entity: 'Tag',
  action: 'Update',
  mutationFn: ({ id, updates }: { id: string; updates: Partial<Tag> }) => updateTagInDB(id, updates),
  invalidateKeys: [photoKeys.tags()],
  onSuccessMessage: '标签更新成功',
});

export const useDeleteTagMutation = createMutationHook({
  entity: 'Tag',
  action: 'Delete',
  mutationFn: deleteTagFromDB,
  invalidateKeys: [photoKeys.tags()],
  onSuccessMessage: '标签删除成功',
});

export const useAddCategoryMutation = createMutationHook({
  entity: 'Category',
  action: 'Add',
  mutationFn: addCategoryToDB,
  invalidateKeys: [photoKeys.categories()],
  onSuccessMessage: '分类添加成功',
});

export const useUpdateCategoryMutation = createMutationHook({
  entity: 'Category',
  action: 'Update',
  mutationFn: ({ id, updates }: { id: string; updates: Partial<Category> }) => updateCategoryInDB(id, updates),
  invalidateKeys: [photoKeys.categories()],
  onSuccessMessage: '分类更新成功',
});

export const useDeleteCategoryMutation = createMutationHook({
  entity: 'Category',
  action: 'Delete',
  mutationFn: deleteCategoryFromDB,
  invalidateKeys: [photoKeys.categories()],
  onSuccessMessage: '分类删除成功',
});

export const useAddManufacturerMutation = createMutationHook({
  entity: 'Manufacturer',
  action: 'Add',
  mutationFn: addManufacturerToDB,
  invalidateKeys: [photoKeys.manufacturers()],
  onSuccessMessage: '厂商添加成功',
});

export const useUpdateManufacturerMutation = createMutationHook({
  entity: 'Manufacturer',
  action: 'Update',
  mutationFn: ({ id, updates }: { id: string; updates: Partial<Manufacturer> }) => updateManufacturerInDB(id, updates),
  invalidateKeys: [photoKeys.manufacturers()],
  onSuccessMessage: '厂商更新成功',
});

export const useDeleteManufacturerMutation = createMutationHook({
  entity: 'Manufacturer',
  action: 'Delete',
  mutationFn: deleteManufacturerFromDB,
  invalidateKeys: [photoKeys.manufacturers()],
  onSuccessMessage: '厂商删除成功',
});
