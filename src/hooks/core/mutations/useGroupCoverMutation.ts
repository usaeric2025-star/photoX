import { createMutationHook } from './factory';
import { updatePhotosGroupInCloud, setPhotoAsGroupCoverInCloud } from '@/services/photos';

export const useGroupCoverMutation = () => {
    return createMutationHook({
        entity: 'Group',
        action: 'UpdateCover',
        mutationFn: async ({ photoId, groupId }: { photoId: string | null, groupId?: string }) => {
            let resolvedGroupId = groupId;
            if (resolvedGroupId && photoId) {
                await setPhotoAsGroupCoverInCloud(photoId, resolvedGroupId);
            } else if (photoId) {
                await updatePhotosGroupInCloud([photoId], { is_group_cover: true });
            } else if (resolvedGroupId) {
                // targetPhotoId is null, means remove cover? I'm not sure how it's implemented.
                // Looking at useGroupAdminLogic, if photoId is null, it removes cover.
                await setPhotoAsGroupCoverInCloud('', resolvedGroupId);
            }
            return null;
        },
        invalidateKeys: [['groups'], ['photos']],
        onSuccessMessage: '封面设置成功',
    })();
};