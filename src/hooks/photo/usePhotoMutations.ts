import { useQueryClient } from '#lib/query/index.js';
import { updatePhoto, deleteMany, batchUpdate } from '#src/services/photo/commands.js';
import { showToast } from '#lib/ui/toast.js';
import { useTranslation } from '../core/useTranslation.js';
import { useSelectionActions } from '../../services/selection/selectionService.js';
import { useInvalidatePhotos } from './useInvalidatePhotos.js';
import { Photo } from '#src/types/index.js';
import { useOptimisticPhotoMutation } from '#lib/query/optimistic.js';

/**
 * 照片樂觀更新工具
 */

/**
 * 照片相關的所有 Mutation 鉤子
 */
export const usePhotoMutations = () => {
  const queryClient = useQueryClient();
  const { uiTranslations: t } = useTranslation();
  const { clearSelection } = useSelectionActions();
  const { invalidateList, invalidateDetail } = useInvalidatePhotos();

  // 1. 編輯單張照片
  const editMutation = useOptimisticPhotoMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Photo> }) => updatePhoto(id, updates),
    onMutateOptimistic: ({ id, updates }) => ({ ids: id, updater: (photo) => ({ ...photo, ...updates }) }),
    errorContext: 'photo-update',
    onSettled: (_, __, { id }) => {
      invalidateList();
      invalidateDetail(id);
    }
  });

  // 2. 切換置頂狀態
  const togglePinMutation = useOptimisticPhotoMutation({
    mutationFn: ({ id, isPinned }: { id: string; isPinned: boolean }) => updatePhoto(id, { isPinned }),
    onMutateOptimistic: ({ id, isPinned }) => ({ ids: id, updater: (photo) => ({ ...photo, isPinned }) }),
    errorContext: 'photo-toggle-pin',
    onSuccess: (_, { isPinned }) => {
      showToast.success(typeof t.togglePinnedSuccess === 'function' ? t.togglePinnedSuccess(isPinned) : (isPinned ? '已置頂' : '已取消置頂'));
    },
    onSettled: () => {
      invalidateList();
    }
  });

  // 3. 刪除照片 (支援單張或批量)
  const deleteMutation = useOptimisticPhotoMutation({
    mutationFn: async (ids: string | string[]) => {
      const idArray = Array.isArray(ids) ? ids : [ids];
      return await deleteMany(idArray);
    },
    onMutateOptimistic: (ids) => ({ ids, updater: () => null }),
    errorContext: 'photo-delete',
    onSuccess: () => {
      showToast.success(t.photoDeleted || '照片已删除');
      clearSelection();
    },
    onSettled: () => {
      invalidateList();
    }
  });

  // 4. 批量編輯
  const batchEditMutation = useOptimisticPhotoMutation({
    mutationFn: ({ ids, updates }: { ids: string[]; updates: Partial<Photo> }) => batchUpdate(ids, updates),
    onMutateOptimistic: ({ ids, updates }) => ({ ids, updater: (photo) => ({ ...photo, ...updates }) }),
    errorContext: 'photo-batch-update',
    onSuccess: (res) => {
      const count = res?.successCount || 0;
      showToast.success(typeof t.batchUpdateSuccess === 'function' ? t.batchUpdateSuccess(count) : (t.batchUpdateSuccess || `成功更新 ${count} 张照片`));
      clearSelection();
    },
    onSettled: () => {
      invalidateList();
    }
  });

  return {
    editPhoto: editMutation.mutate,
    editPhotoAsync: editMutation.mutateAsync,
    togglePin: togglePinMutation.mutate,
    deletePhoto: deleteMutation.mutate,
    deletePhotoAsync: deleteMutation.mutateAsync,
    batchEdit: batchEditMutation.mutate,
    batchEditAsync: batchEditMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    isEditing: editMutation.isPending,
    isBatchEditing: batchEditMutation.isPending,
    // Raw mutation objects for advanced usage/compatibility
    editMutation,
    togglePinMutation,
    deleteMutation,
    batchEditMutation
  };
};
