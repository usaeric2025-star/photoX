import { createMutationHook } from '../core/mutationFactory';
import { Tag, Category, Manufacturer } from '@/types';
import { addTagToDB, updateTagInDB, deleteTagFromDB } from '@/services/tag/commands';
import { addCategoryToDB, updateCategoryInDB, deleteCategoryFromDB } from '@/services/category/commands';
import { addManufacturerToDB, updateManufacturerInDB, deleteManufacturerFromDB } from '@/services/manufacturer/commands';
import { tagKeys, categoryKeys, manufacturerKeys, photoKeys, groupKeys } from '@/lib/queryKeys';
import { useQueryClient } from '@tanstack/react-query';
import { useInvalidatePhotos } from '@/hooks/photo';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { api } from '@/lib/api';

export const useTagCreate = createMutationHook({
  entity: 'Tag', 
  action: 'Add',
  mutationFn: async (variables: Partial<Tag>) => {
    const res = await addTagToDB(variables.name || '');
    if (!res) throw new Error('标签创建失败');
    return res;
  },
  optimisticUpdate: (old: Tag[] | undefined, variables: Partial<Tag>) => {
    return [...(old || []), { id: 'temp-' + Date.now(), ...variables } as Tag];
  },
  invalidateKeys: [tagKeys.tags(), photoKeys.all],
  onSuccessMessage: '标签添加成功',
});

export const useTagEdit = createMutationHook({
  entity: 'Tag',
  action: 'Update',
  mutationFn: async ({ id, updates }: { id: string; updates: Partial<Tag> }) => {
    const res = await updateTagInDB(id, updates);
    if (!res) throw new Error('标签更新失败');
    return true;
  },
  optimisticUpdate: (old: Tag[] | undefined, { id, updates }: { id: string; updates: Partial<Tag> }) => {
    return (old || []).map(t => t.id === id ? { ...t, ...updates } : t);
  },
  invalidateKeys: [tagKeys.tags(), photoKeys.all],
  onSuccessMessage: '标签更新成功',
});

export const useTagDelete = createMutationHook({
  entity: 'Tag',
  action: 'Delete',
  mutationFn: async (id: string) => {
    const res = await deleteTagFromDB(id);
    if (!res) throw new Error('标签删除失败');
    return true;
  },
  optimisticUpdate: (old: Tag[] | undefined, id: string) => {
    return (old || []).filter(t => t.id !== id);
  },
  invalidateKeys: [tagKeys.tags(), photoKeys.all],
  onSuccessMessage: '标签删除成功',
});

export const useCategoryCreate = createMutationHook({
  entity: 'Category',
  action: 'Add',
  mutationFn: async (variables: Partial<Category>) => {
    const res = await addCategoryToDB(variables.name || '');
    if (!res) throw new Error('分类创建失败');
    return res;
  },
  optimisticUpdate: (old: Category[] | undefined, variables: Partial<Category>) => {
    return [...(old || []), { id: 'temp-' + Date.now(), ...variables } as Category];
  },
  invalidateKeys: [categoryKeys.categories(), photoKeys.all],
  onSuccessMessage: '分类添加成功',
});

export const useCategoryEdit = createMutationHook({
  entity: 'Category',
  action: 'Update',
  mutationFn: async ({ id, updates }: { id: string; updates: Partial<Category> }) => {
    const res = await updateCategoryInDB(id, updates);
    if (!res) throw new Error('分类更新失败');
    return true;
  },
  optimisticUpdate: (old: Category[] | undefined, { id, updates }: { id: string; updates: Partial<Category> }) => {
    return (old || []).map(c => c.id === id ? { ...c, ...updates } : c);
  },
  invalidateKeys: [categoryKeys.categories(), photoKeys.all],
  onSuccessMessage: '分类更新成功',
});

export const useCategoryDelete = createMutationHook({
  entity: 'Category',
  action: 'Delete',
  mutationFn: async (id: string) => {
    const res = await deleteCategoryFromDB(id);
    if (!res) throw new Error('分类删除失败');
    return true;
  },
  optimisticUpdate: (old: Category[] | undefined, id: string) => {
    return (old || []).filter(c => c.id !== id);
  },
  invalidateKeys: [categoryKeys.categories(), photoKeys.all],
  onSuccessMessage: '分类删除成功',
});

export const useManufacturerCreate = createMutationHook({
  entity: 'Manufacturer',
  action: 'Add',
  mutationFn: async (variables: Partial<Manufacturer>) => {
    const res = await addManufacturerToDB(variables.name || '');
    if (!res) throw new Error('厂商创建失败');
    return res;
  },
  optimisticUpdate: (old: Manufacturer[] | undefined, variables: Partial<Manufacturer>) => {
    return [...(old || []), { id: 'temp-' + Date.now(), ...variables } as Manufacturer];
  },
  invalidateKeys: [manufacturerKeys.manufacturers(), photoKeys.all],
  onSuccessMessage: '厂商添加成功',
});

export const useManufacturerEdit = createMutationHook({
  entity: 'Manufacturer',
  action: 'Update',
  mutationFn: async ({ id, updates }: { id: string; updates: Partial<Manufacturer> }) => {
    const res = await updateManufacturerInDB(id, updates);
    if (!res) throw new Error('厂商更新失败');
    return true;
  },
  optimisticUpdate: (old: Manufacturer[] | undefined, { id, updates }: { id: string; updates: Partial<Manufacturer> }) => {
    return (old || []).map(m => m.id === id ? { ...m, ...updates } : m);
  },
  invalidateKeys: [manufacturerKeys.manufacturers(), photoKeys.all],
  onSuccessMessage: '厂商更新成功',
});

export const useManufacturerDelete = createMutationHook({
  entity: 'Manufacturer',
  action: 'Delete',
  mutationFn: async (id: string) => {
    const res = await deleteManufacturerFromDB(id);
    if (!res) throw new Error('厂商删除失败');
    return true;
  },
  optimisticUpdate: (old: Manufacturer[] | undefined, id: string) => {
    return (old || []).filter(m => m.id !== id);
  },
  invalidateKeys: [manufacturerKeys.manufacturers(), photoKeys.all],
  onSuccessMessage: '厂商删除成功',
});

export const useRepairMutation = createMutationHook({
  entity: 'Admin',
  action: 'Repair',
  mutationFn: async (issueId: string) => {
    const res = await api.admin.repair.$post({ json: { issueId } });
    if (!res.ok) {
        const errorData = await res.json() as any;
        throw ErrorFactory.wrap(new Error(errorData?.error || `HTTP ${res.status}`), 'runRepair', issueId);
    }
    return res.json() as any;
  },
  invalidateKeys: [photoKeys.all, groupKeys.all],
  onSuccessMessage: '修复成功',
});

export const useSyncMutation = createMutationHook({
  entity: 'Sync',
  action: 'Run',
  mutationFn: async (type: 'push' | 'pull') => {
    if (type === 'pull') {
      const { queryClient } = await import('@/lib/queryClient');
      await queryClient.invalidateQueries({ queryKey: [tagKeys.tags()] });
      await queryClient.invalidateQueries({ queryKey: [categoryKeys.categories()] });
      await queryClient.invalidateQueries({ queryKey: [manufacturerKeys.manufacturers()] });
      await queryClient.invalidateQueries({ queryKey: [groupKeys.all] });
      await queryClient.invalidateQueries({ queryKey: photoKeys.all });
    }
  },
  onSuccessMessage: '同步完成',
});

export const useAdminMutations = () => {
  const repair = useRepairMutation();

  return {
    useRepairMutation: () => repair,
  };
};
