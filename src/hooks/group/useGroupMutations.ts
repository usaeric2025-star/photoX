import { useAppMutation } from '#lib/query/index.js';
import { useSelectionActions } from '../../hooks/selection/useSelection.js';
import { useInvalidatePhotos } from '../photo/useInvalidatePhotos.js';
import { useTranslation } from '../core/index.js';
import { showToast } from '#lib/ui/toast.js';
import { ProductGroup } from '#src/types/index.js';
import { GroupService } from './service.js';

/**
 * useGroupMutations
 * 
 * 處理群組相關的所有寫操作（創建、更新、刪除、移動、設為封面等）。
 */
export function useGroupMutations() {
  const { clearSelection } = useSelectionActions();
  const { invalidateList } = useInvalidatePhotos();
  const { t } = useTranslation();

  const createMutation = useAppMutation({
    mutationFn: (args: { name: string; userId: string }) => GroupService.create({ name: args.name, userId: args.userId }),
    onSuccess: () => {
      showToast.success(t('groupCreated'));
      invalidateList();
    },
  });

  const updateMutation = useAppMutation({
    mutationFn: (args: { id: string; updates: Partial<ProductGroup> }) => GroupService.update(args.id, args.updates),
    onSuccess: () => {
      showToast.success(t('groupUpdated'));
      invalidateList();
    },
  });

  const deleteMutation = useAppMutation({
    mutationFn: GroupService.delete,
    onSuccess: () => {
      showToast.success(t('groupDeleted'));
      invalidateList();
    },
  });

  const setCoverMutation = useAppMutation({
    mutationFn: (args: { groupId: string; photoId: string }) => GroupService.setCover(args.photoId, args.groupId),
    onSuccess: () => {
      showToast.success(t('setCoverSuccess'));
      invalidateList();
    },
    onError: () => { invalidateList(); }
  });

  const movePhotosMutation = useAppMutation({
    mutationFn: (args: { groupId: string; photoIds: string[] }) => GroupService.movePhotos(args.photoIds, args.groupId),
    onSuccess: (_, variables) => {
      showToast.success(t('addPhotosSuccess', variables.photoIds.length));
      clearSelection();
      invalidateList();
    },
    onError: () => { invalidateList(); }
  });

  const dissolveMutation = useAppMutation({
    mutationFn: (groupId: string) => GroupService.ungroup(groupId),
    onSuccess: () => {
      showToast.success(t('groupDissolved'));
      invalidateList();
    },
  });

  const combineMutation = useAppMutation({
    mutationFn: (args: { photoIds: string[]; targetGroupId?: string }) => GroupService.groupPhotos(args.photoIds, args.targetGroupId),
    onSuccess: (data: { newGroupId: string }, variables) => {
      showToast.success(t('mergePhotosSuccess', variables.photoIds.length));
      clearSelection();
      invalidateList();
    },
    onError: () => { invalidateList(); }
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

// --- Legacy Compatibility ---

export const useGroupPhotosMutation = () => {
  const { combine, isPending } = useGroupMutations();
  return { mutateAsync: combine.mutateAsync, isPending };
};

export const useRemoveFromGroupMutation = () => {
  const { isPending } = useGroupMutations();
  const { invalidateList } = useInvalidatePhotos();
  const { t } = useTranslation();

  return { 
    mutateAsync: (args: { photoIds: string[]; groupId?: string }) => {
      if (!args.groupId) throw new Error('groupId is required');
      return GroupService.removePhotos(args.photoIds, args.groupId).then((res) => {
          showToast.success(t('removePhotosSuccess', args.photoIds.length));
          invalidateList();
          return res;
      }).catch(err => {
          invalidateList();
          throw err;
      });
    },
    isPending 
  };
};
