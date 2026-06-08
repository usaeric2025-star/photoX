import { createMutationHook, optimistic } from './core/mutationFactory';
import { groupKeys, photoKeys } from '@/lib/queryKeys';
import { createGroup, updateGroup, deleteGroupFromCloud, groupPhotos, movePhotosToGroup, setPhotoAsGroupCover, ungroupPhotos } from '@/services/group/commands';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { Photo, ProductGroup } from '@/types';

export const useGroupCreate = createMutationHook({
  entity: 'Group',
  action: 'Create',
  mutationFn: async (variables: ProductGroup) => {
    const res = await createGroup(variables);
    if (!res.ok) throw ErrorFactory.wrap(new Error(res.message), 'Create Group');
    return res.data;
  },
  queryKey: groupKeys.all,
  optimisticUpdate: optimistic.infinite.add<ProductGroup>(),
  invalidateKeys: [groupKeys.all],
  onSuccessMessage: '分組創建成功',
});

export const useGroupUpdate = createMutationHook({
  entity: 'Group',
  action: 'Update',
  mutationFn: async ({ id, updates }: { id: string; updates: Partial<ProductGroup> }) => {
    const res = await updateGroup(id, updates);
    if (!res.ok) throw ErrorFactory.wrap(new Error(res.message), 'Update Group', id);
    return res.data;
  },
  queryKey: groupKeys.all,
  optimisticUpdate: optimistic.infinite.update<ProductGroup>(),
  invalidateKeys: [groupKeys.all],
  onSuccessMessage: '分組修改成功',
});

export const useGroupDelete = createMutationHook({
  entity: 'Group',
  action: 'Delete',
  mutationFn: async (id: string) => {
    const res = await deleteGroupFromCloud(id);
    if (!res.ok) throw ErrorFactory.wrap(new Error(res.message), 'Delete Group', id);
    return res.data;
  },
  queryKey: groupKeys.all,
  optimisticUpdate: optimistic.infinite.remove<ProductGroup>(),
  invalidateKeys: [groupKeys.all, photoKeys.all],
  onSuccessMessage: '分組已刪除',
});

export const useGroupCoverMutation = createMutationHook({
  entity: 'Group',
  action: 'SetCover',
  mutationFn: async ({ groupId, photoId }: { groupId: string | undefined; photoId: string | null }) => {
    const res = await setPhotoAsGroupCover(photoId, groupId || '');
    if (!res.ok) throw ErrorFactory.wrap(new Error(res.message), 'Set Group Cover');
    return res.data;
  },
  invalidateKeys: [groupKeys.all, photoKeys.all],
  onSuccessMessage: '封面設置成功',
});

export const useGroupPhotosMutation = createMutationHook({
  entity: 'Group',
  action: 'GroupPhotos',
  mutationFn: async ({ photoIds, targetGroupId }: { photoIds: string[], targetGroupId?: string }) => {
    const res = await groupPhotos(photoIds, targetGroupId);
    if (!res.ok) throw ErrorFactory.wrap(new Error(res.message), 'Group Photos');
    return res.data;
  },
  invalidateKeys: [photoKeys.all, groupKeys.all],
  onSuccessMessage: '合組成功',
});

export const useRemoveFromGroupMutation = createMutationHook({
  entity: 'Group',
  action: 'RemovePhotos',
  mutationFn: async ({ photoIds }: { photoIds: string[]; groupId: string }) => {
    const res = await movePhotosToGroup(photoIds, null);
    if (!res.ok) throw ErrorFactory.wrap(new Error(res.message), 'Remove From Group');
    return res.data;
  },
  invalidateKeys: [photoKeys.all, groupKeys.all],
  onSuccessMessage: '已移出群組',
});

export const useUngroupMutation = createMutationHook({
  entity: 'Group',
  action: 'Ungroup',
  mutationFn: async (groupId: string) => {
    const res = await ungroupPhotos(groupId);
    if (!res.ok) throw ErrorFactory.wrap(new Error(res.message), 'Ungroup Photos');
    return res.data;
  },
  invalidateKeys: [photoKeys.all, groupKeys.all],
  onSuccessMessage: '群組已解散',
});

export const useGroupMutations = () => {
  const create = useGroupCreate();
  const update = useGroupUpdate();
  const remove = useGroupDelete();
  const setCover = useGroupCoverMutation();
  const combine = useGroupPhotosMutation();
  const removePhotos = useRemoveFromGroupMutation();
  const dissolve = useUngroupMutation();
  return {
    create,
    update,
    remove,
    setCover,
    combine,
    removePhotos,
    dissolve,
  };
};
