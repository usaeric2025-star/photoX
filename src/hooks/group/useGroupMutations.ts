import { useAppMutation } from '#lib/query/index.js';
import { useSelectionActions } from '../../hooks/selection/useSelection.js';
import { useInvalidatePhotos } from '../photo/useInvalidatePhotos.js';
import { useTranslation } from '../core/index.js';
import { showToast } from '#lib/ui/toast.js';
import { ProductGroup, Photo } from '#src/types/index.js';
import { GroupService } from './service.js';
import { useOptimisticPhotoMutation } from '#lib/query/optimistic.js';
import { generateId } from '#lib/id.js';

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

  const setCoverMutation = useOptimisticPhotoMutation({
    mutationFn: (args: { groupId: string; photoId: string }) => GroupService.setCover(args.photoId, args.groupId),
    onMutateOptimistic: (args) => ({
      ids: args.photoId,
      updater: (photo: Photo) => ({
        ...photo,
        isGroupCover: true,
        isCover: true,
      } as Photo),
    }),
    errorContext: 'setCover',
    onSuccess: () => {
      showToast.success(t('setCoverSuccess'));
    },
    onSettled: () => {
      invalidateList();
    },
  });

  const movePhotosMutation = useOptimisticPhotoMutation({
    mutationFn: (args: { groupId: string; photoIds: string[] }) => GroupService.movePhotos(args.photoIds, args.groupId),
    onMutateOptimistic: (args) => ({
      ids: args.photoIds,
      updater: (photo: Photo) => ({
        ...photo,
        groupId: args.groupId,
        groupName: 'GROUP',
        isGroupCover: false,
        isCover: false,
      } as Photo),
    }),
    errorContext: 'movePhotos',
    onSuccess: (_, variables) => {
      showToast.success(t('addPhotosSuccess', variables.photoIds.length));
      clearSelection();
    },
    onSettled: () => {
      invalidateList();
    },
  });

  const dissolveMutation = useAppMutation({
    mutationFn: (groupId: string) => GroupService.ungroup(groupId),
    onSuccess: () => {
      showToast.success(t('groupDissolved'));
      invalidateList();
    },
  });

  const combineMutation = useOptimisticPhotoMutation({
    mutationFn: (args: { photoIds: string[]; targetGroupId?: string }) => GroupService.groupPhotos(args.photoIds, args.targetGroupId),
    onMutateOptimistic: (args) => {
      const targetGroupId = args.targetGroupId || generateId();
      args.targetGroupId = targetGroupId;
      return {
        ids: args.photoIds,
        updater: (photo: Photo) => ({
          ...photo,
          groupId: targetGroupId,
          groupName: 'GROUP',
          isGroupCover: false,
          isCover: false,
        } as Photo),
      };
    },
    errorContext: 'combinePhotos',
    onSuccess: (_, variables) => {
      showToast.success(t('mergePhotosSuccess', variables.photoIds.length));
      clearSelection();
    },
    onSettled: () => {
      invalidateList();
    },
  });

  const removePhotosMutation = useOptimisticPhotoMutation({
    mutationFn: (args: { photoIds: string[]; groupId: string }) => GroupService.removePhotos(args.photoIds, args.groupId),
    onMutateOptimistic: (args) => ({
      ids: args.photoIds,
      updater: (photo: Photo) => ({
        ...photo,
        groupId: null,
        groupName: null,
        isGroupCover: false,
        isCover: false,
      } as Photo),
    }),
    errorContext: 'removePhotos',
    onSuccess: (_, variables) => {
      showToast.success(t('removePhotosSuccess', variables.photoIds.length));
      clearSelection();
    },
    onSettled: () => {
      invalidateList();
    },
  });

  return {
    create: createMutation,
    update: updateMutation,
    remove: deleteMutation,
    setCover: setCoverMutation,
    combine: combineMutation,
    movePhotos: movePhotosMutation,
    dissolve: dissolveMutation,
    removePhotos: removePhotosMutation,
    isPending: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || 
                setCoverMutation.isPending || combineMutation.isPending || movePhotosMutation.isPending || 
                dissolveMutation.isPending || removePhotosMutation.isPending,
  };
}

// --- Legacy Compatibility ---

export const useGroupPhotosMutation = () => {
  const { combine, isPending } = useGroupMutations();
  return { mutateAsync: combine.mutateAsync, isPending };
};

export const useRemoveFromGroupMutation = () => {
  const { removePhotos, isPending } = useGroupMutations();

  return { 
    mutateAsync: (args: { photoIds: string[]; groupId?: string }) => {
      if (!args.groupId) throw new Error('groupId is required');
      return removePhotos.mutateAsync({ photoIds: args.photoIds, groupId: args.groupId });
    },
    isPending 
  };
};
