import { Manufacturer } from '@/types';
import { addManufacturerToDB, updateManufacturerInDB, deleteManufacturerFromDB } from '@/services/manufacturer/commands';
import { queryKeys } from '@/lib/query/keys';
import { defineMutation } from '@/lib/mutations/defineMutation';
import { useOptimisticMutation } from '@/lib/mutations/useOptimisticMutation';

// 1. 创建厂商
const manufacturerCreateConfig = defineMutation<Manufacturer, string | Partial<Manufacturer>, readonly unknown[]>({
  name: 'manufacturerCreate',
  service: async (variables) => {
    const name = typeof variables === 'string' ? variables : (variables.name || '');
    const res = await addManufacturerToDB(name);
    if (!res) throw new Error('厂商创建失败');
    return res;
  },
  invalidate: () => [queryKeys.manufacturers.all, queryKeys.photos.all],
  successMessage: '厂商添加成功',
});
export const useManufacturerCreate = () => useOptimisticMutation(manufacturerCreateConfig);

// 2. 编辑厂商
const manufacturerEditConfig = defineMutation<boolean, { id: number; updates: Partial<Manufacturer> }, readonly unknown[]>({
  name: 'manufacturerEdit',
  service: async ({ id, updates }) => {
    const res = await updateManufacturerInDB(id, updates);
    if (!res) throw new Error('厂商更新失败');
    return true;
  },
  invalidate: () => [queryKeys.manufacturers.all, queryKeys.photos.all],
  successMessage: '厂商更新成功',
});
export const useManufacturerEdit = () => useOptimisticMutation(manufacturerEditConfig);

// 3. 删除厂商
const manufacturerDeleteConfig = defineMutation<boolean, number, readonly unknown[]>({
  name: 'manufacturerDelete',
  service: async (id) => {
    const res = await deleteManufacturerFromDB(id);
    if (!res) throw new Error('厂商删除失败');
    return true;
  },
  invalidate: () => [queryKeys.manufacturers.all, queryKeys.photos.all],
  successMessage: '厂商删除成功',
});
export const useManufacturerDelete = () => useOptimisticMutation(manufacturerDeleteConfig);

