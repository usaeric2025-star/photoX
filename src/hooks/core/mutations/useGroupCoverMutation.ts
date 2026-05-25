import { createMutationHook } from '@/hooks/_factory/createMutationHook';
import { updatePhotosGroupInCloud, setPhotoAsGroupCoverInCloud } from '@/services/photoService';
import { Photo } from '@/types';
import { useQueryClient } from '@tanstack/react-query';

export const useGroupCoverMutation = () => {
  const queryClient = useQueryClient();
  
  return createMutationHook({
    entity: 'Group',
    action: 'UpdateCover',
    mutationFn: async ({ photoId, groupId }: { photoId: string | null, groupId?: string }) => {
      // Logic for resolving groupId
      let resolvedGroupId = groupId;
      // ... implementation ...
      if (resolvedGroupId) {
        await setPhotoAsGroupCoverInCloud(photoId, resolvedGroupId);
      } else if (photoId) {
        await updatePhotosGroupInCloud([photoId], { is_group_cover: true });
      }
      return null;
    },
    invalidateKeys: [['groups'], ['photos']],
    onSuccessMessage: '封面设置成功',
  })();
};
