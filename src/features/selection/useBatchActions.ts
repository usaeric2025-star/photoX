import { useCallback } from 'react';
import { batchService } from './batchService';
import { useSelection } from './SelectionContext';
import { Photo } from '@/types';
import { useInvalidatePhotos } from '@/hooks';
import { useFormSubmit } from '@/lib/form/useFormSubmit';
import { type } from 'arktype';

export function useBatchActions() {
  const { state, clear } = useSelection();
  const invalidatePhotos = useInvalidatePhotos();

  const { submit: runBatchDelete, isLoading: isDeleting } = useFormSubmit({
    schema: type('any'),
    mutationFn: async () => {
      const res = await batchService.delete(state.selectedIds);
      if (!res.success) throw new Error(res.error || '刪除失敗');
      return res;
    },
    onSuccess: () => {
      invalidatePhotos();
      clear();
    },
    successMessage: `已刪除 ${state.selectedIds.length} 張照片`,
    errorMessage: '批次刪除失敗'
  });

  const { submit: runBatchUpdate, isLoading: isUpdating } = useFormSubmit({
    schema: type('any'),
    mutationFn: async (data: Partial<Photo>) => {
      const res = await batchService.update(state.selectedIds, data);
      if (!res.success) throw new Error(res.error || '更新失敗');
      return res;
    },
    onSuccess: () => {
      invalidatePhotos();
      clear();
    },
    successMessage: `已更新 ${state.selectedIds.length} 張照片`,
    errorMessage: '批次更新失敗'
  });

  const { submit: runBatchTag, isLoading: isTagging } = useFormSubmit({
    schema: type('any'),
    mutationFn: async (tagIds: string[]) => {
      const res = await batchService.addTags(state.selectedIds, tagIds);
      if (!res.success) throw new Error(res.error || '新增標籤失敗');
      return res;
    },
    onSuccess: () => {
      invalidatePhotos();
      clear();
    },
    successMessage: `已為 ${state.selectedIds.length} 張照片新增標籤`,
    errorMessage: '批次新增標籤失敗'
  });

  return {
    batchDelete: { mutate: runBatchDelete, isPending: isDeleting },
    batchUpdate: { mutate: runBatchUpdate, isPending: isUpdating },
    batchTag: { mutate: runBatchTag, isPending: isTagging },
    isPending: isDeleting || isUpdating || isTagging,
    selectedCount: state.selectedIds.length,
  };
}
