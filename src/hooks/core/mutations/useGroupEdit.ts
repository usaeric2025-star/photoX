import { createMutationHook } from './factory';
import { groupPhotos, removePhotosFromGroup } from '@/services/photo/commands';
import { ungroupPhotos } from '@/services/photo/photoMaintenanceService';

export const useGroupEdit = createMutationHook({
  entity: 'Group',
  action: 'Edit',
  mutationFn: ({ photoIds, groupId }: { photoIds: string[]; groupId: string }) => 
    removePhotosFromGroup(photoIds, groupId),
  invalidateKeys: [['groups'], ['photos']],
  onSuccessMessage: '已移出群组',
});

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

export const useRemoveFromGroupMutation = useGroupEdit;

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
