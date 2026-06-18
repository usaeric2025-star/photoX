import { optimistic } from '@/lib/query/mutationFactory';
import { queryKeys } from '@/lib/query/keys';
import { createGroup, updateGroup, deleteGroupFromCloud, groupPhotos, movePhotosToGroup, setPhotoAsGroupCover, ungroupPhotos } from '@/services/group/commands';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { Photo, ProductGroup } from '@/types';
import { defineMutation } from '@/lib/mutations/defineMutation';
import { useAppMutation } from '@/lib/mutations/useAppMutation';

// 1. 创建合组
const groupCreateConfig = defineMutation<ProductGroup, ProductGroup, readonly unknown[]>({
  name: 'groupCreate',
  service: async (variables) => {
    return await createGroup(variables);
  },
  invalidate: () => [queryKeys.groups.all],
  successMessage: '已创建合组',
});

export const useGroupCreate = () => useAppMutation(groupCreateConfig);

// 2. 更新合组
const groupUpdateConfig = defineMutation<
  ProductGroup,
  { id: string; updates: Partial<ProductGroup> },
  readonly unknown[]
>({
  name: 'groupUpdate',
  service: async ({ id, updates }) => {
    return await updateGroup(id, updates);
  },
  invalidate: () => [queryKeys.groups.all],
  successMessage: '已修改',
});

export const useGroupUpdate = () => useAppMutation(groupUpdateConfig);

// 3. 删除合组
const groupDeleteConfig = defineMutation<void, string, readonly unknown[]>({
  name: 'groupDelete',
  service: async (id) => {
    return await deleteGroupFromCloud(id);
  },
  invalidate: () => [queryKeys.groups.all, queryKeys.photos.all],
  successMessage: '已删除',
});

export const useGroupDelete = () => useAppMutation(groupDeleteConfig);

// 4. 设置封面
const groupCoverConfig = defineMutation<
  void,
  { groupId: string | undefined; photoId: string | null },
  readonly unknown[]
>({
  name: 'groupCover',
  service: async ({ groupId, photoId }) => {
    return await setPhotoAsGroupCover(photoId, groupId || '');
  },
  invalidate: () => [queryKeys.groups.all, queryKeys.photos.all],
  successMessage: '已设为封面',
});

export const useGroupCoverMutation = () => useAppMutation(groupCoverConfig);

// 5. 照片合组
const groupPhotosConfig = defineMutation<
  { newGroupId: string },
  { photoIds: string[], targetGroupId?: string },
  readonly unknown[]
>({
  name: 'groupPhotos',
  service: async ({ photoIds, targetGroupId }) => {
    return await groupPhotos(photoIds, targetGroupId);
  },
  invalidate: () => [queryKeys.photos.all, queryKeys.groups.all],
  optimistic: (old, { photoIds, targetGroupId }, queryKey) => {
    if (!old) return old;
    type PhotoInfiniteData = { pages: { photos?: Photo[]; items?: Photo[] }[] };
    const oldData = old as PhotoInfiniteData;
    if (oldData.pages) {
      const queryVars = (queryKey && queryKey.length > 2 ? queryKey[2] : {}) as { groupId?: string };
      const currentViewGroupId = queryVars?.groupId;
      
      if (currentViewGroupId && currentViewGroupId !== targetGroupId) {
          return optimistic.infinite.remove<Photo>()(oldData, photoIds);
      }
      
      return optimistic.infinite.batchUpdate<Photo>()(oldData, {
        ids: photoIds,
        updates: { group_id: targetGroupId ?? null }
      });
    }
    return old;
  },
  successMessage: '已合组',
});

export const useGroupPhotosMutation = () => useAppMutation(groupPhotosConfig);

// 6. 从合组移出
const removePhotosConfig = defineMutation<
  void,
  { photoIds: string[]; groupId: string },
  readonly unknown[]
>({
  name: 'removePhotosFromGroup',
  service: async ({ photoIds }) => {
    await movePhotosToGroup(photoIds, null);
  },
  invalidate: () => [queryKeys.photos.all, queryKeys.groups.all],
  optimistic: (old, { photoIds }, queryKey) => {
    if (!old) return old;
    type PhotoInfiniteData = { pages: { photos?: Photo[]; items?: Photo[] }[] };
    const oldData = old as PhotoInfiniteData;
    if (oldData.pages) {
      const queryVars = (queryKey && queryKey.length > 2 ? queryKey[2] : {}) as { groupId?: string };
      const currentViewGroupId = queryVars?.groupId;
      
      if (currentViewGroupId) {
          return optimistic.infinite.remove<Photo>()(oldData, photoIds);
      }

      return optimistic.infinite.batchUpdate<Photo>()(oldData, {
        ids: photoIds,
        updates: { group_id: null }
      });
    }
    return old;
  },
  successMessage: '已移出',
});

export const useRemoveFromGroupMutation = () => useAppMutation(removePhotosConfig);

// 7. 解散合组
const ungroupConfig = defineMutation<void, string, readonly unknown[]>({
  name: 'ungroup',
  service: async (groupId) => {
    return await ungroupPhotos(groupId);
  },
  invalidate: () => [queryKeys.photos.all, queryKeys.groups.all],
  optimistic: (old, groupId) => {
    if (!old) return old;
    type PhotoInfiniteData = { pages: { photos: Photo[] }[] };
    const oldData = old as PhotoInfiniteData;
    if (oldData.pages) {
      return {
        ...oldData,
        pages: oldData.pages.map((page) => ({
          ...page,
          photos: page.photos?.map((p) => p.group_id === groupId ? { ...p, group_id: null, is_group_cover: false } : p) || []
        }))
      };
    }
    return old;
  },
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
