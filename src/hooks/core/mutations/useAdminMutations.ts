import { createMutationHook } from '@/hooks/_factory/createMutationHook';
import { Tag, Category, Manufacturer } from '@/types';
import { addTagToDB, updateTagInDB, deleteTagFromDB } from '@/services/tagService';
import { addCategoryToDB, updateCategoryInDB, deleteCategoryFromDB } from '@/services/categoryService';
import { addManufacturerToDB, updateManufacturerInDB, deleteManufacturerFromDB } from '@/services/manufacturerService';
import { QUERY_KEYS } from '@/hooks/queries/keys';

export const useAddTagMutation = createMutationHook({
  entity: 'Tag', 
  action: 'Add',
  mutationFn: addTagToDB,
  invalidateKeys: [QUERY_KEYS.tags],
  onSuccessMessage: '标签添加成功',
  taskLevel: 'heavy',
});

export const useUpdateTagMutation = createMutationHook({
  entity: 'Tag',
  action: 'Update',
  mutationFn: ({ id, updates }: { id: string; updates: Partial<Tag> }) => updateTagInDB(id, updates),
  invalidateKeys: [QUERY_KEYS.tags],
  onSuccessMessage: '标签更新成功',
  taskLevel: 'heavy',
});

export const useDeleteTagMutation = createMutationHook({
  entity: 'Tag',
  action: 'Delete',
  mutationFn: deleteTagFromDB,
  invalidateKeys: [QUERY_KEYS.tags],
  onSuccessMessage: '标签删除成功',
});

export const useAddCategoryMutation = createMutationHook({
  entity: 'Category',
  action: 'Add',
  mutationFn: addCategoryToDB,
  invalidateKeys: [QUERY_KEYS.categories],
  onSuccessMessage: '分类添加成功',
});

export const useUpdateCategoryMutation = createMutationHook({
  entity: 'Category',
  action: 'Update',
  mutationFn: ({ id, updates }: { id: string; updates: Partial<Category> }) => updateCategoryInDB(id, updates),
  invalidateKeys: [QUERY_KEYS.categories],
  onSuccessMessage: '分类更新成功',
});

export const useDeleteCategoryMutation = createMutationHook({
  entity: 'Category',
  action: 'Delete',
  mutationFn: deleteCategoryFromDB,
  invalidateKeys: [QUERY_KEYS.categories],
  onSuccessMessage: '分类删除成功',
});

export const useAddManufacturerMutation = createMutationHook({
  entity: 'Manufacturer',
  action: 'Add',
  mutationFn: addManufacturerToDB,
  invalidateKeys: [QUERY_KEYS.manufacturers],
  onSuccessMessage: '厂商添加成功',
});

export const useUpdateManufacturerMutation = createMutationHook({
  entity: 'Manufacturer',
  action: 'Update',
  mutationFn: ({ id, updates }: { id: string; updates: Partial<Manufacturer> }) => updateManufacturerInDB(id, updates),
  invalidateKeys: [QUERY_KEYS.manufacturers],
  onSuccessMessage: '厂商更新成功',
});

export const useDeleteManufacturerMutation = createMutationHook({
  entity: 'Manufacturer',
  action: 'Delete',
  mutationFn: deleteManufacturerFromDB,
  invalidateKeys: [QUERY_KEYS.manufacturers],
  onSuccessMessage: '厂商删除成功',
});
