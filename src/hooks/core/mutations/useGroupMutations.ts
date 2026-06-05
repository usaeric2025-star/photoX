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
    setPhotoAsGroupCoverInCloud(photoId, groupId || ''),
  optimisticUpdate: async (variables: { groupId: string | undefined; photoId: string | null }, queryClient: any) => {
    await queryClient.cancelQueries({ queryKey: photoKeys.all });
    const previousData = queryClient.getQueryData(photoKeys.all);
    queryClient.setQueriesData({ queryKey: photoKeys.all }, (old: any) => {
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
    });
    return { previousData };
  },
  rollback: (_err: any, _vars: any, context: any, queryClient: any) => {
    if (context?.previousData) {
      queryClient.setQueriesData({ queryKey: photoKeys.all }, context.previousData);
    }
  },
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
  optimisticUpdate: async (variables: { photoIds: string[], targetGroupId?: string }, queryClient: any) => {
    await queryClient.cancelQueries({ queryKey: photoKeys.all });
    const previousData = queryClient.getQueryData(photoKeys.all);

    queryClient.setQueriesData({ queryKey: photoKeys.all }, (old: any) => {
      if (!old || !old.pages) return old;
      
      return {
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          photos: page.photos.map((photo: any) => {
            const isInSelected = variables.photoIds.includes(photo.id);
            const isPartofMergedGroups = photo.group_id && old.pages.some((p: any) => p.photos.some((ph: any) => ph.id === photo.id && variables.photoIds.includes(ph.id))); // This is still a bit complex, let's simplify

            // Simplified: if photo is selected, update it.
            // Complex merging logic might require the variables to include info about sourceGroupIds.
            // Let's just update based on simple inclusion for now to match the user's requirement.
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
    });
    return { previousData };
  },
  rollback: (_err: any, _vars: any, context: any, queryClient: any) => {
    if (context?.previousData) {
      queryClient.setQueriesData({ queryKey: photoKeys.all }, context.previousData);
    }
  },
  invalidateKeys: [photoKeys.all, groupKeys.all],
  onSuccessMessage: '合组成功',
});

export const useRemoveFromGroupMutation = createMutationHook({
  entity: 'Group',
  action: 'RemovePhotos',
  mutationFn: ({ photoIds, groupId }: { photoIds: string[]; groupId: string }) => 
    removePhotosFromGroup(photoIds, groupId),
  optimisticUpdate: async (variables: { photoIds: string[], groupId: string }, queryClient: any) => {
    await queryClient.cancelQueries({ queryKey: photoKeys.all });
    const previousData = queryClient.getQueryData(photoKeys.all);
    queryClient.setQueriesData({ queryKey: photoKeys.all }, (old: any) => {
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
    });
    return { previousData };
  },
  rollback: (_err: any, _vars: any, context: any, queryClient: any) => {
    if (context?.previousData) {
      queryClient.setQueriesData({ queryKey: photoKeys.all }, context.previousData);
    }
  },
  invalidateKeys: [photoKeys.all, groupKeys.all],
  onSuccessMessage: '已移出群组',
});

export const useUngroupMutation = createMutationHook({
  entity: 'Group',
  action: 'Ungroup',
  mutationFn: (groupId: string) => ungroupPhotos(groupId),
  optimisticUpdate: async (groupId: string, queryClient: any) => {
    await queryClient.cancelQueries({ queryKey: photoKeys.all });
    const previousData = queryClient.getQueryData(photoKeys.all);
    queryClient.setQueriesData({ queryKey: photoKeys.all }, (old: any) => {
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
    });
    return { previousData };
  },
  rollback: (_err: any, _vars: any, context: any, queryClient: any) => {
    if (context?.previousData) {
      queryClient.setQueriesData({ queryKey: photoKeys.all }, context.previousData);
    }
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
