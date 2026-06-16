import { optimistic } from '@/lib/query/mutationFactory';
import { queryKeys } from '@/lib/query/keys';
import { createGroup, updateGroup, deleteGroupFromCloud, groupPhotos, movePhotosToGroup, setPhotoAsGroupCover, ungroupPhotos } from '@/services/group/commands';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { Photo, ProductGroup } from '@/types';
import { defineMutation } from '@/lib/mutations/defineMutation';
import { useAppMutation } from '@/lib/mutations/useAppMutation';

const groupCreateConfig = defineMutation<ProductGroup, ProductGroup>({
  name: 'groupCreate',
  service: async (variables: ProductGroup) => {
    return await createGroup(variables);
  },
  invalidate: () => [queryKeys.groups.all as unknown as unknown[]],
  successMessage: '已创建合组',
});

export const useGroupCreate = () => useAppMutation(groupCreateConfig);

const groupUpdateConfig = defineMutation<ProductGroup, { id: string; updates: Partial<ProductGroup> }>({
  name: 'groupUpdate',
  service: async ({ id, updates }) => {
    return await updateGroup(id, updates);
  },
  invalidate: () => [queryKeys.groups.all as unknown as unknown[]],
  successMessage: '已修改',
});

export const useGroupUpdate = () => useAppMutation(groupUpdateConfig);

const groupDeleteConfig = defineMutation<any, string>({
  name: 'groupDelete',
  service: async (id: string) => {
    return await deleteGroupFromCloud(id);
  },
  invalidate: () => [queryKeys.groups.all as unknown as unknown[], queryKeys.photos.all as unknown as unknown[]],
  successMessage: '已删除',
});

export const useGroupDelete = () => useAppMutation(groupDeleteConfig);

const groupCoverConfig = defineMutation<any, { groupId: string | undefined; photoId: string | null }>({
  name: 'groupCover',
  service: async ({ groupId, photoId }) => {
    return await setPhotoAsGroupCover(photoId, groupId || '');
  },
  invalidate: () => [queryKeys.groups.all as unknown as any[], queryKeys.photos.all as unknown as any[]],
  successMessage: '已设为封面',
});

export const useGroupCoverMutation = () => useAppMutation(groupCoverConfig);

const groupPhotosConfig = defineMutation<any, { photoIds: string[], targetGroupId?: string }>({
  name: 'groupPhotos',
  service: async ({ photoIds, targetGroupId }) => {
    return await groupPhotos(photoIds, targetGroupId);
  },
  invalidate: () => [queryKeys.photos.all as unknown as any[], queryKeys.groups.all as unknown as any[]],
  optimistic: (old: any, { photoIds, targetGroupId }: { photoIds: string[], targetGroupId?: string }, queryKey?: readonly unknown[]) => {
    if (!old) return old;
    if (old.pages) {
      const queryVars: any = queryKey && queryKey.length > 2 ? queryKey[2] : {};
      const currentViewGroupId = queryVars?.groupId;
      
      if (currentViewGroupId && currentViewGroupId !== targetGroupId) {
          return optimistic.infinite.remove<Photo>()(old, photoIds);
      }
      
      return optimistic.infinite.batchUpdate<Photo>()(old, {
        ids: photoIds,
        updates: { group_id: targetGroupId ?? null }
      });
    }
    return old;
  },
  successMessage: '已合组',
  onError: (error) => {
    const errorStr = (typeof error === 'string' ? error : error?.message || '').toLowerCase();
    if (errorStr.includes('foreign key constraint') || errorStr.includes('23503') || errorStr.includes('fk_photo_group')) {
      import('sonner').then(({ toast }) => {
        toast.error('操作違反資料完整性，請確保所有照片已正確歸屬');
      });
      return true; // handled
    }
    return false; // let default handler process it
  }
});

export const useGroupPhotosMutation = () => useAppMutation(groupPhotosConfig);

const removePhotosConfig = defineMutation<any, { photoIds: string[]; groupId: string }>({
  name: 'removePhotosFromGroup',
  service: async ({ photoIds }) => {
    return await movePhotosToGroup(photoIds, null);
  },
  invalidate: () => [queryKeys.photos.all as unknown as any[], queryKeys.groups.all as unknown as any[]],
  optimistic: (old: any, { photoIds }: { photoIds: string[] }, queryKey?: readonly unknown[]) => {
    if (!old) return old;
    if (old.pages) {
      const queryVars: any = queryKey && queryKey.length > 2 ? queryKey[2] : {};
      const currentViewGroupId = queryVars?.groupId;
      
      if (currentViewGroupId) {
          return optimistic.infinite.remove<Photo>()(old, photoIds);
      }

      return optimistic.infinite.batchUpdate<Photo>()(old, {
        ids: photoIds,
        updates: { group_id: null }
      });
    }
    return old;
  },
  successMessage: '已移出',
});

export const useRemoveFromGroupMutation = () => useAppMutation(removePhotosConfig);

const ungroupConfig = defineMutation<any, string>({
  name: 'ungroup',
  service: async (groupId: string) => {
    return await ungroupPhotos(groupId);
  },
  invalidate: () => [queryKeys.photos.all as unknown as any[], queryKeys.groups.all as unknown as any[]],
  optimistic: (old: any, groupId: string, queryKey?: readonly unknown[]) => {
    if (!old) return old;
    if (old.pages) {
      // Find all photos in this group and nullify their group_id
      return {
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          photos: page.photos?.map((p: any) => p.group_id === groupId ? { ...p, group_id: null, is_group_cover: false } : p) || []
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
