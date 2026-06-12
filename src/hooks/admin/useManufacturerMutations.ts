import { Manufacturer } from '@/types';
import { addManufacturerToDB, updateManufacturerInDB, deleteManufacturerFromDB } from '@/services/manufacturer/commands';
import { manufacturerKeys, photoKeys } from '@/lib/queryKeys';
import { defineMutation } from '@/lib/mutations/defineMutation';
import { useAppMutation } from '@/lib/mutations/useAppMutation';

const manufacturerCreateConfig = defineMutation<Manufacturer, string | Partial<Manufacturer>>({
  name: 'manufacturerCreate',
  service: async (variables) => {
    const name = typeof variables === 'string' ? variables : (variables.name || '');
    const res = await addManufacturerToDB(name);
    if (!res) throw new Error('厂商创建失败');
    return res;
  },
  invalidate: () => [manufacturerKeys.manufacturers() as any, photoKeys.all as any],
  successMessage: '厂商添加成功',
});
export const useManufacturerCreate = () => useAppMutation(manufacturerCreateConfig);

const manufacturerEditConfig = defineMutation<boolean, { id: string; updates: Partial<Manufacturer> }>({
  name: 'manufacturerEdit',
  service: async ({ id, updates }) => {
    const res = await updateManufacturerInDB(id, updates);
    if (!res) throw new Error('厂商更新失败');
    return true;
  },
  invalidate: () => [manufacturerKeys.manufacturers() as any, photoKeys.all as any],
  successMessage: '厂商更新成功',
});
export const useManufacturerEdit = () => useAppMutation(manufacturerEditConfig);

const manufacturerDeleteConfig = defineMutation<boolean, string>({
  name: 'manufacturerDelete',
  service: async (id: string) => {
    const res = await deleteManufacturerFromDB(id);
    if (!res) throw new Error('厂商删除失败');
    return true;
  },
  invalidate: () => [manufacturerKeys.manufacturers() as any, photoKeys.all as any],
  successMessage: '厂商删除成功',
});
export const useManufacturerDelete = () => useAppMutation(manufacturerDeleteConfig);
