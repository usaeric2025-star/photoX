import { createMutationHook } from './factory';
import { addManufacturerToDB } from '@/services/manufacturer/commands';
import { photoKeys } from '@/lib/queryKeys';

export const useManufacturerCreate = createMutationHook({
  entity: 'Manufacturer',
  action: 'Add',
  mutationFn: addManufacturerToDB,
  invalidateKeys: [photoKeys.manufacturers()],
  onSuccessMessage: '厂商添加成功',
});
