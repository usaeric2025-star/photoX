import { createMutationHook } from '@/hooks/_factory/createMutationHook';
import { batchUpdatePhotosInCloud } from '@/services/photoMutationService';
import { Photo } from '@/types';

/**
 * Hook for batch updating multiple photos.
 */
export const usePhotoBatchUpdate = createMutationHook({
  entity: 'Photo',
  action: 'BatchUpdate',
  mutationFn: async (vars: { userId: string, ids: string[]; updates: Partial<Photo> }) => {
    return await batchUpdatePhotosInCloud(vars.userId, vars.ids, vars.updates);
  },
  invalidateKeys: [['photos', 'infinite'], ['photos', 'group']],
  onSuccessMessage: (data, vars) => `已成功更新 ${vars.ids.length} 张照片`,
  taskLevel: 'heavy',
});
