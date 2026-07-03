import { Manufacturer } from '#src/types/index.js';
import { addManufacturerToDB, updateManufacturerInDB, deleteManufacturerFromDB } from '#src/services/manufacturer/commands.js';
import { queryKeys } from '#lib/query/keys.js';
import { useAppMutation, queryClient } from '#lib/query/index.js';

// 1. 创建厂商
export const useManufacturerCreate = () => useAppMutation({
  mutationFn: async (variables: string | Partial<Manufacturer>) => {
    const name = typeof variables === 'string' ? variables : (variables.name || '');
    const res = await addManufacturerToDB(name);
    if (!res) throw new Error('厂商创建失败');
    return res;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.manufacturers.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.photos.all });
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
    queryClient.invalidateQueries({ queryKey: queryKeys.manufacturers.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.photos.all });
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
    queryClient.invalidateQueries({ queryKey: queryKeys.manufacturers.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.photos.all });
  }
});
