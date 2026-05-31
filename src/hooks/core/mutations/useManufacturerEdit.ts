import { createMutationHook } from './factory';
import { SubCategory as Manufacturer } from '@/types';
import { updateManufacturerInDB } from '@/services/manufacturer/commands';
import { photoKeys } from '@/lib/queryKeys';

export const useManufacturerEdit = createMutationHook({
  entity: 'Manufacturer',
  action: 'Update',
  mutationFn: ({ id, updates }: { id: string; updates: Partial<Manufacturer> }) => updateManufacturerInDB(id, updates),
  invalidateKeys: [photoKeys.manufacturers()],
  onSuccessMessage: '厂商更新成功',
});
