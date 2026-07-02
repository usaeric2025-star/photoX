import { useAppMutation, appQuery } from '#lib/query/index.js';
import { 
  createGroup, 
  updateGroup, 
  deleteGroup, 
  setPhotoAsGroupCover, 
  groupPhotos,
  movePhotosToGroup,
  ungroupPhotos
} from '#src/services/group/commands.js';
import { queryKeys } from '#lib/query/keys.js';
import { ProductGroup } from '#src/types/index.js';

// Helper to invalidate photos cache robustly
const invalidatePhotos = () => {
  appQuery.invalidatePhotos();
};

export function useGroupMutations() {
  const createMutation = useAppMutation({
    mutationFn: (args: { name: string; userId: string }) => 
      createGroup({ name: args.name, userId: args.userId }),
    onSuccess: () => appQuery.mutate(queryKeys.groups.all),
  });

  const updateMutation = useAppMutation({
    mutationFn: (args: { id: string; updates: Partial<ProductGroup> }) => 
      updateGroup(args.id, args.updates),
    onSuccess: (_, variables) => {
      invalidatePhotos();
      appQuery.mutate(queryKeys.groups.detail(variables.id, false));
      appQuery.mutate(queryKeys.groups.detail(variables.id, true));
    }
  });

  const deleteMutation = useAppMutation({
    mutationFn: deleteGroup,
    onSuccess: () => {
      invalidatePhotos();
    }
  });

  const setCoverMutation = useAppMutation({
    mutationFn: (args: { groupId: string; photoId: string }) => 
      setPhotoAsGroupCover(args.photoId, args.groupId),
    onSuccess: (_, variables) => {
      invalidatePhotos();
      appQuery.mutate(queryKeys.groups.detail(variables.groupId, false));
      appQuery.mutate(queryKeys.groups.detail(variables.groupId, true));
    }
  });

  const movePhotosMutation = useAppMutation({
    mutationFn: (args: { groupId: string; photoIds: string[] }) => 
      movePhotosToGroup(args.photoIds, args.groupId),
    onSuccess: (_, variables) => {
      invalidatePhotos();
      appQuery.mutate(queryKeys.groups.detail(variables.groupId, false));
      appQuery.mutate(queryKeys.groups.detail(variables.groupId, true));
    }
  });

  const dissolveMutation = useAppMutation({
    mutationFn: ungroupPhotos,
    onSuccess: () => {
      appQuery.mutate(queryKeys.groups.all);
      invalidatePhotos();
    }
  });

  const combineMutation = useAppMutation({
    mutationFn: (args: { photoIds: string[]; targetGroupId?: string }) => 
      groupPhotos(args.photoIds, args.targetGroupId),
    onSuccess: () => {
      invalidatePhotos();
    }
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

/**
 * Legacy/Component aliases for SelectionToolbar
 */
export const useRemoveFromGroupMutation = () => {
  const { movePhotos, isMutating } = useGroupMutations();
  return { 
    mutateAsync: (args: { photoIds: string[]; groupId?: string }) => 
      movePhotos.mutateAsync({ groupId: args.groupId || '', photoIds: args.photoIds }),
    isMutating 
  };
};
