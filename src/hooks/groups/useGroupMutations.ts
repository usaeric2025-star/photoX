import { queryKeys } from '@/lib/query/keys';
import { createGroup, updateGroup, deleteGroup, groupPhotos, movePhotosToGroup, setPhotoAsGroupCover, ungroupPhotos } from '@/services/group/commands';
import { Photo, ProductGroup } from '@/types';
import { useAppMutation } from '@/lib/query';

// 1. 创建合组
export const useGroupCreate = () => useAppMutation({
  mutationFn: async (variables: ProductGroup) => {
    return await createGroup(variables);
  },
});

// 2. 更新合组
export const useGroupUpdate = () => useAppMutation({
  mutationFn: async ({ id, updates }: { id: string; updates: Partial<ProductGroup> }) => {
    return await updateGroup(id, updates);
  },
});

// 3. 删除合组
export const useGroupDelete = () => useAppMutation({
  mutationFn: async (id: string) => {
    return await deleteGroup(id);
  },
});

// 4. 设置封面
export const useGroupCoverMutation = () => useAppMutation({
  mutationFn: async ({ groupId, photoId }: { groupId: string | undefined; photoId: string | null }) => {
    return await setPhotoAsGroupCover(photoId, groupId || '');
  },
});

// 5. 照片合组
export const useGroupPhotosMutation = () => useAppMutation({
  mutationFn: async ({ photoIds, targetGroupId }: { photoIds: string[], targetGroupId?: string }) => {
    const finalGroupId = targetGroupId || crypto.randomUUID();
    return await groupPhotos(photoIds, finalGroupId);
  },
});

// 6. 从合组移出
export const useRemoveFromGroupMutation = () => useAppMutation({
  mutationFn: async ({ photoIds }: { photoIds: string[]; groupId: string }) => {
    await movePhotosToGroup(photoIds, null);
  },
});

// 7. 解散合组
export const useUngroupMutation = () => useAppMutation({
  mutationFn: async (groupId: string) => {
    return await ungroupPhotos(groupId);
  },
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

