import { Manufacturer } from '@/types';
import { addManufacturerToDB, updateManufacturerInDB, deleteManufacturerFromDB } from '@/services/manufacturer/commands';
import { queryKeys } from '@/lib/query/keys';
import { useAppMutation, appQuery } from '@/lib/query';

// 1. 创建厂商
export const useManufacturerCreate = () => useAppMutation({
  mutationFn: async (variables: string | Partial<Manufacturer>) => {
    const name = typeof variables === 'string' ? variables : (variables.name || '');
    const res = await addManufacturerToDB(name);
    if (!res) throw new Error('厂商创建失败');
    return res;
  },
  onSuccess: () => {
    appQuery.mutate(queryKeys.manufacturers.all);
    appQuery.mutate((key) => {
      if (!key) return false;
      const keyStr = typeof key === 'string' ? key : JSON.stringify(key);
      return keyStr.includes('photos');
    });
  }
});

// 2. 编辑厂商
export const useManufacturerEdit = () => useAppMutation({
  mutationFn: async ({ id, updates }: { id: string; updates: Partial<Manufacturer> }) => {
    const res = await updateManufacturerInDB(id, updates);
    if (!res) throw new Error('厂商更新失败');
    return true;
  },
  onSuccess: () => {
    appQuery.mutate(queryKeys.manufacturers.all);
    appQuery.mutate((key) => {
      if (!key) return false;
      const keyStr = typeof key === 'string' ? key : JSON.stringify(key);
      return keyStr.includes('photos');
    });
  }
});

// 3. 删除厂商
export const useManufacturerDelete = () => useAppMutation({
  mutationFn: async (id: string) => {
    const res = await deleteManufacturerFromDB(id);
    if (!res) throw new Error('厂商删除失败');
    return true;
  },
  onSuccess: () => {
    appQuery.mutate(queryKeys.manufacturers.all);
    appQuery.mutate((key) => {
      if (!key) return false;
      const keyStr = typeof key === 'string' ? key : JSON.stringify(key);
      return keyStr.includes('photos');
    });
  }
});

function useManufacturerMutations() {
  const create = useManufacturerCreate();
  const update = useManufacturerEdit();
  const remove = useManufacturerDelete();

  return {
    create: create.mutateAsync,
    update: update.mutateAsync,
    remove: remove.mutateAsync,
    isMutating: create.isPending || update.isPending || remove.isPending,
  };
}
