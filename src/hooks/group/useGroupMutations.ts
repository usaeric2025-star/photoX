import { useAppMutation, queryClient } from '#lib/query/index.js';
import { 
  createGroup, 
  updateGroup, 
  deleteGroup, 
  setPhotoAsGroupCover, 
  groupPhotos,
  movePhotosToGroup,
  removePhotosFromGroup,
  ungroupPhotos
} from '#src/services/group/commands.js';
import { queryKeys } from '#lib/query/keys.js';
import { ProductGroup } from '#src/types/index.js';
import { useSelectionActions } from '#src/hooks/index.js';
import { showToast } from '#lib/ui/toast.js';

// Helper to invalidate photos cache robustly
const invalidatePhotos = () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.photos.all });
};

export function useGroupMutations() {
  const { clearSelection } = useSelectionActions();

  const createMutation = useAppMutation({
    mutationFn: (args: { name: string; userId: string }) => 
      createGroup({ name: args.name, userId: args.userId }),
    onSuccess: () => {
      showToast.success('分組已建立');
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
    },
    onError: (err: any) => showToast.error(`建立分組失敗: ${err.message}`)
  });

  const updateMutation = useAppMutation({
    mutationFn: (args: { id: string; updates: Partial<ProductGroup> }) => 
      updateGroup(args.id, args.updates),
    onSuccess: (_, variables) => {
      showToast.success('分組資訊已更新');
      invalidatePhotos();
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
    },
    onError: (err: any) => showToast.error(`更新分組失敗: ${err.message}`)
  });

  const deleteMutation = useAppMutation({
    mutationFn: deleteGroup,
    onSuccess: () => {
      showToast.success('分組已刪除');
      invalidatePhotos();
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
    },
    onError: (err: any) => showToast.error(`刪除分組失敗: ${err.message}`)
  });

  const setCoverMutation = useAppMutation({
    mutationFn: (args: { groupId: string; photoId: string }) => {
      return setPhotoAsGroupCover(args.photoId, args.groupId);
    },
    onSuccess: () => {
      showToast.success('已成功設定封面照片');
      invalidatePhotos();
    },
    onError: (err: any) => {
      showToast.error(`設定封面失敗: ${err.message}`);
      invalidatePhotos();
    }
  });

  const movePhotosMutation = useAppMutation({
    mutationFn: (args: { groupId: string; photoIds: string[] }) => {
      return movePhotosToGroup(args.photoIds, args.groupId);
    },
    onSuccess: (_, variables) => {
      showToast.success(`成功將 ${variables.photoIds.length} 張照片加入分組`);
      clearSelection();
      invalidatePhotos();
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
    },
    onError: (err: any) => {
      showToast.error(`加入分組失敗: ${err.message}`);
      invalidatePhotos();
    }
  });

  const dissolveMutation = useAppMutation({
    mutationFn: async (groupId: string) => {
      return ungroupPhotos(groupId);
    },
    onSuccess: () => {
      showToast.success('分組已解散');
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
      invalidatePhotos();
    },
    onError: (err: any) => {
      showToast.error(`解散分組失敗: ${err.message}`);
    }
  });

  const combineMutation = useAppMutation({
    mutationFn: async (args: { photoIds: string[]; targetGroupId?: string }) => {
      return await groupPhotos(args.photoIds, args.targetGroupId);
    },
    onSuccess: (data: { newGroupId: string }, variables) => {
      const count = variables.photoIds.length;
      showToast.success(`成功將 ${count} 張照片合併`);
      clearSelection();
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
      invalidatePhotos();
    },
    onError: (err: any) => {
      showToast.error(`合併照片失敗: ${err.message}`);
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
    isPending: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || 
                setCoverMutation.isPending || combineMutation.isPending || movePhotosMutation.isPending || 
                dissolveMutation.isPending,
  };
}

/**
 * Legacy/Component aliases for SelectionToolbar
 */
export const useGroupPhotosMutation = () => {
  const { combine, isPending } = useGroupMutations();
  return { 
    mutateAsync: combine.mutateAsync,
    isPending 
  };
};

/**
 * Legacy/Component aliases for SelectionToolbar
 */
export const useRemoveFromGroupMutation = () => {
  const { isPending } = useGroupMutations();
  return { 
    mutateAsync: (args: { photoIds: string[]; groupId?: string }) => {
      if (!args.groupId) throw new Error('groupId is required to remove photos from group');
      
      return removePhotosFromGroup(args.photoIds, args.groupId).then((res) => {
          import('#lib/ui/toast.js').then(({ showToast }) => {
            showToast.success(`成功將 ${args.photoIds.length} 張照片移出合組`);
          });
          invalidatePhotos();
          return res;
      }).catch(err => {
          import('#lib/ui/toast.js').then(({ showToast }) => {
            showToast.error(`移出合組失敗: ${err.message}`);
          });
          invalidatePhotos();
          throw err;
      });
    },
    isPending 
  };
};
