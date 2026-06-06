import { createMutationHook } from './core/mutationFactory';
import { groupKeys, photoKeys } from '@/lib/queryKeys';
import { createGroup, updateGroup, deleteGroupFromCloud } from '@/services/group/commands';
import { groupPhotos, movePhotosToGroup, setPhotoAsGroupCover } from '@/services/photo/commands';
import { ungroupPhotos } from '@/services/photo/photoMaintenanceService';
import { QueryClient } from '@tanstack/react-query';

export const useGroupCreate = createMutationHook({
  entity: 'Group',
  action: 'Create',
  mutationFn: createGroup,
  queryKey: groupKeys.all,
  optimisticUpdate: (oldGroups: any, variables: any) => {
    return [...(oldGroups || []), { id: 'temp-' + Date.now(), ...variables, member_count: 0 }];
  },
  invalidateKeys: [groupKeys.all],
  onSuccessMessage: '分组创建成功',
});

export const useGroupUpdate = createMutationHook({
  entity: 'Group',
  action: 'Update',
  mutationFn: ({ id, updates }: { id: string; updates: any }) => updateGroup(id, updates),
  optimisticUpdate: (oldGroups: any, variables: { id: string; updates: any }) => {
    if (!oldGroups) return oldGroups;
    return oldGroups.map((group: any) =>
      group.id === variables.id
        ? { ...group, ...variables.updates }
        : group
    );
  },
  invalidateKeys: [groupKeys.all],
  onSuccessMessage: '分组修改成功',
});

export const useGroupDelete = createMutationHook({
  entity: 'Group',
  action: 'Delete',
  mutationFn: deleteGroupFromCloud,
  optimisticUpdate: (oldGroups: any, variables: string) => {
    if (!oldGroups) return oldGroups;
    return oldGroups.filter((group: any) => group.id !== variables);
  },
  invalidateKeys: [groupKeys.all],
  onSuccessMessage: '分组已删除',
});

export const useGroupCoverMutation = createMutationHook({
  entity: 'Group',
  action: 'SetCover',
  mutationFn: ({ groupId, photoId }: { groupId: string | undefined; photoId: string | null }) => 
    setPhotoAsGroupCover(photoId, groupId || ''),
  optimisticUpdate: (old: any, variables: { groupId: string | undefined; photoId: string | null }) => {
    if (!old || !old.pages) return old;
    const { groupId, photoId } = variables;
    return {
      ...old,
      pages: old.pages.map((page: any) => ({
        ...page,
        photos: page.photos.map((photo: any) => {
          if (photo.group_id === groupId && photo.is_group_cover) {
            return { ...photo, is_group_cover: false };
          }
          if (photo.id === photoId) {
            return { ...photo, is_group_cover: true };
          }
          return photo;
        })
      }))
    };
  },
  invalidateKeys: [groupKeys.all, photoKeys.all],
  onSuccessMessage: '封面设置成功',
});

export const useGroupPhotosMutation = createMutationHook({
  entity: 'Group',
  action: 'GroupPhotos',
  mutationFn: async ({ photoIds, targetGroupId }: { photoIds: string[], targetGroupId?: string }) => {
    const finalGroupId = targetGroupId || crypto.randomUUID();
    const result = await groupPhotos(photoIds, finalGroupId);
    return { photoIds, newGroupId: finalGroupId };
  },
  queryKey: photoKeys.all,
  optimisticUpdate: (old: any, variables: { photoIds: string[], targetGroupId?: string }) => {
    if (!old || !old.pages) return old;
    return {
      ...old,
      pages: old.pages.map((page: any) => ({
        ...page,
        photos: page.photos.map((photo: any) => {
          const isInSelected = variables.photoIds.includes(photo.id);
          if (isInSelected) {
            return { 
              ...photo, 
              group_id: variables.targetGroupId,
              is_group_cover: photo.id === variables.photoIds[0]
            };
          }
          return photo;
        })
      }))
    };
  },
  invalidateKeys: [photoKeys.all, groupKeys.all],
  onSuccessMessage: '合组成功',
});

export const useRemoveFromGroupMutation = createMutationHook({
  entity: 'Group',
  action: 'RemovePhotos',
  mutationFn: ({ photoIds }: { photoIds: string[]; groupId: string }) => 
    movePhotosToGroup(photoIds, null),
  optimisticUpdate: (old: any, variables: { photoIds: string[], groupId: string }) => {
    if (!old || !old.pages) return old;
    return {
      ...old,
      pages: old.pages.map((page: any) => ({
        ...page,
        photos: page.photos.map((photo: any) =>
          variables.photoIds.includes(photo.id)
            ? { ...photo, group_id: null, is_group_cover: false }
            : photo
        )
      }))
    };
  },
  invalidateKeys: [photoKeys.all, groupKeys.all],
  onSuccessMessage: '已移出群组',
});

export const useUngroupMutation = createMutationHook({
  entity: 'Group',
  action: 'Ungroup',
  mutationFn: (groupId: string) => ungroupPhotos(groupId),
  optimisticUpdate: (old: any, groupId: string) => {
    if (!old || !old.pages) return old;
    return {
      ...old,
      pages: old.pages.map((page: any) => ({
        ...page,
        photos: page.photos.map((photo: any) =>
          photo.group_id === groupId
            ? { ...photo, group_id: null, is_group_cover: false }
            : photo
        )
      }))
    };
  },
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
