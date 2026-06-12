import { optimistic } from '@/lib/query/mutationFactory';
import { groupKeys, photoKeys } from '@/lib/queryKeys';
import { createGroup, updateGroup, deleteGroupFromCloud, groupPhotos, movePhotosToGroup, setPhotoAsGroupCover, ungroupPhotos } from '@/services/group/commands';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { Photo, ProductGroup } from '@/types';
import { defineMutation } from '@/lib/mutations/defineMutation';
import { useAppMutation } from '@/lib/mutations/useAppMutation';

const groupCreateConfig = defineMutation<ProductGroup, ProductGroup>({
  service: async (variables: ProductGroup) => {
    const res = await createGroup(variables);
    if (!res.ok) throw ErrorFactory.wrap(new Error(res.message), 'Create Group');
    return res.data;
  },
  invalidate: () => [groupKeys.all as unknown as any[]],
  // Note: Optimistic update with infinite lists can be complex. 
  // Punting on optimistic update refactor within the mutation factory for now.
  successMessage: '已创建合组',
});

export const useGroupCreate = () => useAppMutation(groupCreateConfig);

const groupUpdateConfig = defineMutation<ProductGroup, { id: string; updates: Partial<ProductGroup> }>({
  service: async ({ id, updates }) => {
    const res = await updateGroup(id, updates);
    if (!res.ok) throw ErrorFactory.wrap(new Error(res.message), 'Update Group', id);
    return res.data;
  },
  invalidate: () => [groupKeys.all as unknown as any[]],
  successMessage: '已修改',
});

export const useGroupUpdate = () => useAppMutation(groupUpdateConfig);

const groupDeleteConfig = defineMutation<any, string>({
  service: async (id: string) => {
    const res = await deleteGroupFromCloud(id);
    if (!res.ok) throw new Error(res.message);
    return res.data;
  },
  invalidate: () => [groupKeys.all as unknown as any[], photoKeys.all as unknown as any[]],
  successMessage: '已删除',
});

export const useGroupDelete = () => useAppMutation(groupDeleteConfig);

const groupCoverConfig = defineMutation<any, { groupId: string | undefined; photoId: string | null }>({
  service: async ({ groupId, photoId }) => {
    const res = await setPhotoAsGroupCover(photoId, groupId || '');
    if (!res.ok) throw ErrorFactory.wrap(new Error(res.message), 'Set Group Cover');
    return res.data;
  },
  invalidate: () => [groupKeys.all as unknown as any[], photoKeys.all as unknown as any[]],
  successMessage: '已设为封面',
});

export const useGroupCoverMutation = () => useAppMutation(groupCoverConfig);

const groupPhotosConfig = defineMutation<any, { photoIds: string[], targetGroupId?: string }>({
  service: async ({ photoIds, targetGroupId }) => {
    const res = await groupPhotos(photoIds, targetGroupId);
    if (!res.ok) throw ErrorFactory.wrap(new Error(res.message), 'Group Photos');
    return res.data;
  },
  invalidate: () => [photoKeys.all as unknown as any[], groupKeys.all as unknown as any[]],
  successMessage: '已合组',
});

export const useGroupPhotosMutation = () => useAppMutation(groupPhotosConfig);

const removePhotosConfig = defineMutation<any, { photoIds: string[]; groupId: string }>({
  service: async ({ photoIds }) => {
    const res = await movePhotosToGroup(photoIds, null);
    if (!res.ok) throw ErrorFactory.wrap(new Error(res.message), 'Remove From Group');
    return res.data;
  },
  invalidate: () => [photoKeys.all as unknown as any[], groupKeys.all as unknown as any[]],
  successMessage: '已移出',
});

export const useRemoveFromGroupMutation = () => useAppMutation(removePhotosConfig);

const ungroupConfig = defineMutation<any, string>({
  service: async (groupId: string) => {
    const res = await ungroupPhotos(groupId);
    if (!res.ok) throw ErrorFactory.wrap(new Error(res.message), 'Ungroup Photos');
    return res.data;
  },
  invalidate: () => [photoKeys.all as unknown as any[], groupKeys.all as unknown as any[]],
  successMessage: '已解散',
});

export const useUngroupMutation = () => useAppMutation(ungroupConfig);

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
