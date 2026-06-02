import { createMutationHook } from './factory';
import { Tag, Category, Manufacturer } from '@/types';
import { addTagToDB, updateTagInDB, deleteTagFromDB } from '@/services/tag/commands';
import { addCategoryToDB, updateCategoryInDB, deleteCategoryFromDB } from '@/services/category/commands';
import { addManufacturerToDB, updateManufacturerInDB, deleteManufacturerFromDB } from '@/services/manufacturer/commands';
import { photoKeys } from '@/lib/queryKeys';
import { useQueryClient } from '@tanstack/react-query';
import { useInvalidatePhotos } from '@/hooks/queries/useInvalidatePhotos';

export const useTagCreate = createMutationHook({
  entity: 'Tag', 
  action: 'Add',
  mutationFn: addTagToDB,
  invalidateKeys: [photoKeys.tags()],
  onSuccessMessage: '标签添加成功',
});

export const useTagEdit = createMutationHook({
  entity: 'Tag',
  action: 'Update',
  mutationFn: ({ id, updates }: { id: string; updates: Partial<Tag> }) => updateTagInDB(id, updates),
  invalidateKeys: [photoKeys.tags()],
  onSuccessMessage: '标签更新成功',
});

export const useTagDelete = createMutationHook({
  entity: 'Tag',
  action: 'Delete',
  mutationFn: deleteTagFromDB,
  invalidateKeys: [photoKeys.tags()],
  onSuccessMessage: '标签删除成功',
});

export const useCategoryCreate = createMutationHook({
  entity: 'Category',
  action: 'Add',
  mutationFn: addCategoryToDB,
  invalidateKeys: [photoKeys.categories()],
  onSuccessMessage: '分类添加成功',
});

export const useCategoryEdit = createMutationHook({
  entity: 'Category',
  action: 'Update',
  mutationFn: ({ id, updates }: { id: string; updates: Partial<Category> }) => updateCategoryInDB(id, updates),
  invalidateKeys: [photoKeys.categories()],
  onSuccessMessage: '分类更新成功',
});

export const useCategoryDelete = createMutationHook({
  entity: 'Category',
  action: 'Delete',
  mutationFn: deleteCategoryFromDB,
  invalidateKeys: [photoKeys.categories()],
  onSuccessMessage: '分类删除成功',
});

export const useManufacturerCreate = createMutationHook({
  entity: 'Manufacturer',
  action: 'Add',
  mutationFn: addManufacturerToDB,
  invalidateKeys: [photoKeys.manufacturers()],
  onSuccessMessage: '厂商添加成功',
});

export const useManufacturerEdit = createMutationHook({
  entity: 'Manufacturer',
  action: 'Update',
  mutationFn: ({ id, updates }: { id: string; updates: Partial<Manufacturer> }) => updateManufacturerInDB(id, updates),
  invalidateKeys: [photoKeys.manufacturers()],
  onSuccessMessage: '厂商更新成功',
});

export const useManufacturerDelete = createMutationHook({
  entity: 'Manufacturer',
  action: 'Delete',
  mutationFn: deleteManufacturerFromDB,
  invalidateKeys: [photoKeys.manufacturers()],
  onSuccessMessage: '厂商删除成功',
});

export const useSyncMutation = () => {
  const queryClient = useQueryClient();
  const invalidatePhotos = useInvalidatePhotos();

  return createMutationHook({
    entity: 'Sync',
    action: 'Run',
    mutationFn: async (type: 'push' | 'pull') => {
      if (type === 'pull') {
        invalidatePhotos();
        await queryClient.invalidateQueries({ queryKey: ['tags'] });
        await queryClient.invalidateQueries({ queryKey: ['categories'] });
        await queryClient.invalidateQueries({ queryKey: ['manufacturers'] });
        await queryClient.invalidateQueries({ queryKey: ['groups'] });
      }
    },
    onSuccessMessage: '同步完成',
  })();
};
