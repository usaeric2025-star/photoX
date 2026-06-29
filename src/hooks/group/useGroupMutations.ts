import { useAppMutation, appQuery } from '@/lib/query';
import { 
  createGroup, 
  updateGroup, 
  deleteGroup, 
  setPhotoAsGroupCover, 
  groupPhotos, 
  movePhotosToGroup,
  ungroupPhotos
} from '@/services/group/commands';
import { queryKeys } from '@/lib/query/keys';
import { ProductGroup } from '@/types';

export function useGroupMutations() {
  const createMutation = useAppMutation({
    mutationFn: (args: { name: string; userId: string }) => 
      createGroup({ name: args.name, user_id: args.userId } as any),
    onSuccess: () => appQuery.mutate(queryKeys.groups.all),
  });

  const updateMutation = useAppMutation({
    mutationFn: (args: { id: string; updates: Partial<ProductGroup> }) => 
      updateGroup(args.id, args.updates),
    onSuccess: (_, variables) => {
      appQuery.mutate(queryKeys.groups.all);
      appQuery.mutate(queryKeys.groups.detail(variables.id, false));
    }
  });

  const deleteMutation = useAppMutation({
    mutationFn: deleteGroup,
    onSuccess: () => appQuery.mutate(queryKeys.groups.all),
  });

  const setCoverMutation = useAppMutation({
    mutationFn: (args: { groupId: string; photoId: string }) => 
      setPhotoAsGroupCover(args.photoId, args.groupId),
    onSuccess: (_, variables) => appQuery.mutate(queryKeys.groups.detail(variables.groupId, false)),
  });

  const combineMutation = useAppMutation({
    mutationFn: (args: { photoIds: string[]; targetGroupId?: string }) => 
      groupPhotos(args.photoIds, args.targetGroupId),
    onSuccess: () => appQuery.mutate(queryKeys.groups.all),
  });

  const movePhotosMutation = useAppMutation({
    mutationFn: (args: { groupId: string; photoIds: string[] }) => 
      movePhotosToGroup(args.photoIds, args.groupId),
    onSuccess: (_, variables) => {
      appQuery.mutate(queryKeys.groups.all);
      appQuery.mutate(queryKeys.groups.detail(variables.groupId, false));
    }
  });

  const dissolveMutation = useAppMutation({
    mutationFn: ungroupPhotos,
    onSuccess: () => appQuery.mutate(queryKeys.groups.all),
  });

  return {
    create: createMutation,
    update: updateMutation,
    remove: deleteMutation,
    setCover: setCoverMutation,
    combine: combineMutation,
    movePhotos: movePhotosMutation,
    dissolve: dissolveMutation,
    isMutating: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || 
                setCoverMutation.isPending || combineMutation.isPending || movePhotosMutation.isPending || 
                dissolveMutation.isPending,
  };
}

/**
 * Legacy/Component aliases for SelectionToolbar
 */
export const useGroupPhotosMutation = () => {
  const { combine, isMutating } = useGroupMutations();
  return { 
    mutateAsync: combine.mutateAsync,
    isMutating 
  };
};

export const useRemoveFromGroupMutation = () => {
  const { movePhotos, isMutating } = useGroupMutations();
  return { 
    mutateAsync: (args: { photoIds: string[]; groupId?: string }) => 
      movePhotos.mutateAsync({ groupId: args.groupId || '', photoIds: args.photoIds }),
    isMutating 
  };
};
