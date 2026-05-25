import { createMutationHook } from '@/hooks/_factory/createMutationHook';
import { deletePhotoFromCloud } from '@/services/photoMutationService';
import { Photo } from '@/types';

/**
 * Hook for deleting a photo.
 */
export const usePhotoDelete = createMutationHook({
  entity: 'Photo',
  action: 'Delete',
  mutationFn: async (vars: { userId: string, photo: Photo }) => {
    return await deletePhotoFromCloud(vars.userId, vars.photo);
  },
  invalidateKeys: [['photos'], ['photoCounts']],
  onSuccessMessage: '照片已从库中移除',
});
