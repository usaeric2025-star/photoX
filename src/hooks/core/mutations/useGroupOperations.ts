import { useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { useFeedback, useInvalidatePhotos } from '@/hooks';
import { Photo } from '@/types';

interface InfinitePhotosData {
  photos: Photo[];
  nextCursor?: string;
}

import { createMutationHook } from '@/hooks/_factory/createMutationHook';
import { groupPhotos, ungroupPhotos, removePhotosFromGroup } from '@/services/photoService';

export const useGroupPhotosMutation = createMutationHook({
  entity: 'Group',
  action: 'GroupPhotos',
  mutationFn: async ({ photoIds, targetGroupId }: { photoIds: string[], targetGroupId?: string }) => {
    const finalGroupId = targetGroupId || crypto.randomUUID();
    await groupPhotos(photoIds, finalGroupId);
    return { photoIds, newGroupId: finalGroupId };
  },
  invalidateKeys: [['photos'], ['groups']],
  onSuccessMessage: '合组成功',
});

export const useRemoveFromGroupMutation = createMutationHook({
  entity: 'Group',
  action: 'RemovePhotos',
  mutationFn: ({ photoIds, groupId }: { photoIds: string[]; groupId: string }) => 
    removePhotosFromGroup(photoIds, groupId),
  invalidateKeys: [['groups'], ['photos']],
  onSuccessMessage: '已移出群组',
});

export const useUngroupMutation = createMutationHook({
  entity: 'Group',
  action: 'Ungroup',
  mutationFn: (groupId: string) => ungroupPhotos(groupId),
  invalidateKeys: [['groups']],
  onSuccessMessage: '群组已解散',
});

export const useDeleteGroupFromCloudMutation = createMutationHook({
  entity: 'Group',
  action: 'Delete',
  mutationFn: (groupId: string) => ungroupPhotos(groupId),
  invalidateKeys: [['groups']],
  onSuccessMessage: '群组已删除',
});
