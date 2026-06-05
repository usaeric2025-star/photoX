import { createMutationHook } from './factory';
import { groupKeys, photoKeys } from '@/lib/queryKeys';
import { createGroup, updateGroup, deleteGroupFromCloud } from '@/services/group/commands';
import { groupPhotos, removePhotosFromGroup, setPhotoAsGroupCoverInCloud } from '@/services/photo/commands';
import { ungroupPhotos } from '@/services/photo/photoMaintenanceService';
import { QueryClient } from '@tanstack/react-query';

export const useGroupCreate = createMutationHook({
  entity: 'Group',
  action: 'Create',
  mutationFn: createGroup,
  invalidateKeys: [groupKeys.all],
  onSuccessMessage: '分组创建成功',
});

export const useGroupUpdate = createMutationHook({
  entity: 'Group',
  action: 'Update',
  mutationFn: ({ id, updates }: { id: string; updates: any }) => updateGroup(id, updates),
  invalidateKeys: [groupKeys.all],
  onSuccessMessage: '分组修改成功',
});

export const useGroupDelete = createMutationHook({
  entity: 'Group',
  action: 'Delete',
  mutationFn: deleteGroupFromCloud,
  invalidateKeys: [groupKeys.all],
  onSuccessMessage: '分组已删除',
});

export const useGroupCoverMutation = createMutationHook({
  entity: 'Group',
  action: 'SetCover',
  mutationFn: ({ groupId, photoId }: { groupId: string | undefined; photoId: string | null }) => 
    setPhotoAsGroupCoverInCloud(photoId, groupId || ''),
  invalidateKeys: [groupKeys.all, photoKeys.all],
  onSuccessMessage: '封面设置成功',
});

export const useGroupPhotosMutation = createMutationHook({
  entity: 'Group',
  action: 'GroupPhotos',
  mutationFn: async ({ photoIds, targetGroupId, expandGroups }: { photoIds: string[], targetGroupId?: string, expandGroups?: boolean }) => {
    const finalGroupId = targetGroupId || crypto.randomUUID();
    const result = await groupPhotos(photoIds, finalGroupId, expandGroups);
    return { photoIds: result.finalPhotoIds || photoIds, newGroupId: finalGroupId };
  },
  queryKey: photoKeys.lists(), // Ensure optimistic updates operate on list data
  optimisticUpdate: (oldPhotos: any, variables: { photoIds: string[], targetGroupId?: string }) => {
    if (!oldPhotos) return oldPhotos;
    
    // Find the groups containing any of the selected photo IDs to merge their siblings optimistically too
    const sourceGroupIds = oldPhotos
      .filter((p: any) => variables.photoIds.includes(p.id) && p.group_id)
      .map((p: any) => p.group_id);

    return oldPhotos.map((photo: any) => {
      const isInSelected = variables.photoIds.includes(photo.id);
      const isPartofMergedGroups = photo.group_id && sourceGroupIds.includes(photo.group_id);

      if (isInSelected || isPartofMergedGroups) {
        return { 
          ...photo, 
          group_id: variables.targetGroupId,
          is_group_cover: photo.id === variables.photoIds[0]
        };
      }
      return photo;
    });
  },
  invalidateKeys: [photoKeys.all, groupKeys.all],
  onSuccessMessage: '合组成功',
});

export const useRemoveFromGroupMutation = createMutationHook({
  entity: 'Group',
  action: 'RemovePhotos',
  mutationFn: ({ photoIds, groupId }: { photoIds: string[]; groupId: string }) => 
    removePhotosFromGroup(photoIds, groupId),
  invalidateKeys: [photoKeys.all, groupKeys.all],
  onSuccessMessage: '已移出群组',
});

export const useUngroupMutation = createMutationHook({
  entity: 'Group',
  action: 'Ungroup',
  mutationFn: (groupId: string) => ungroupPhotos(groupId),
  invalidateKeys: [photoKeys.all, groupKeys.all],
  onSuccessMessage: '群组已解散',
});

export const useGroupMutations = () => {
  const create = useGroupCreate();
  const update = useGroupUpdate();
  const remove = useGroupDelete();
  const setCover = useGroupCoverMutation();
  const combine = useGroupPhotosMutation();
  const removePhotos = useRemoveFromGroupMutation();
  const dissolve = useUngroupMutation();
  const useBatchAiAnalyze = async (photos: any[]) => { console.warn("useBatchAiAnalyze not fully extracted yet"); };

  return {
    create,
    update,
    remove,
    setCover,
    combine,
    removePhotos,
    dissolve,
    useBatchAiAnalyze,
  };
};
