import { createMutationHook } from '@/hooks/_factory/createMutationHook';
import { updatePhotoInCloud } from '@/services/photoMutationService';
import { Photo } from '@/types';

/**
 * Hook for updating a single photo's properties.
 */
export const usePhotoUpdate = createMutationHook({
  entity: 'Photo',
  action: 'Update',
  mutationFn: async (vars: { id: string; updates: Partial<Photo> }) => {
    return await updatePhotoInCloud(vars.id, vars.updates);
  },
  invalidateKeys: [['photos', 'infinite'], ['photos', 'group']],
  onSuccessMessage: '照片更新成功',
});
