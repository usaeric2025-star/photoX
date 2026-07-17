import { useAppMutation, queryClient } from '#lib/query/index.js';
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
 * 整合所有群組相關的寫操作。
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
    mutationFn: (id: string) => GroupService.delete(id),
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
    }
  });

  const movePhotosMutation = useOptimisticPhotoMutation({
    mutationFn: (args: { groupId: string; photoIds: string[] }) => GroupService.movePhotos(args.photoIds, args.groupId),
    onMutateOptimistic: (args) => ({
      ids: args.photoIds,
      updater: (photo: Photo) => ({
        ...photo,
        groupId: args.groupId,
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
    }
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
      return {
        ids: args.photoIds,
        updater: (photo: Photo) => ({
          ...photo,
          groupId: targetGroupId,
          isGroupCover: false,
          isCover: false,
        } as Photo),
      };
    },
    errorContext: 'combinePhotos',
    onSuccess: (_, variables) => {
      showToast.success(t('mergePhotosSuccess', variables.photoIds.length));
      invalidateList();
    }
  });

  const removePhotosMutation = useOptimisticPhotoMutation({
    mutationFn: (args: { photoIds: string[]; groupId: string }) => GroupService.removePhotos(args.photoIds, args.groupId),
    onMutateOptimistic: (args) => ({
      ids: args.photoIds,
      updater: (photo: Photo) => ({
        ...photo,
        groupId: null,
        isGroupCover: false,
        isCover: false,
      } as Photo),
    }),
    errorContext: 'removePhotos',
    onSuccess: (_, variables) => {
      showToast.success(t('removePhotosSuccess', variables.photoIds.length));
    },
    onSettled: () => {
      invalidateList();
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
    removePhotos: removePhotosMutation,
    isPending: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || 
                setCoverMutation.isPending || combineMutation.isPending || movePhotosMutation.isPending || 
                dissolveMutation.isPending || removePhotosMutation.isPending,
  };
}

export function useGroupPhotosMutation() {
  const { combine } = useGroupMutations();
  return combine;
}

export function useRemoveFromGroupMutation() {
  const { removePhotos } = useGroupMutations();
  return removePhotos;
}
