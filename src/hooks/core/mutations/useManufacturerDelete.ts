import { createMutationHook } from './factory';
import { deleteManufacturerFromDB } from '@/services/manufacturer/commands';
import { photoKeys } from '@/lib/queryKeys';

export const useManufacturerDelete = createMutationHook({
  entity: 'Manufacturer',
  action: 'Delete',
  mutationFn: deleteManufacturerFromDB,
  invalidateKeys: [photoKeys.manufacturers()],
  onSuccessMessage: '厂商删除成功',
});
