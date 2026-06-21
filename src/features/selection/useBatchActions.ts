import { useCallback } from 'react';
import { batchService } from './batchService';
import { useSelection } from './SelectionContext';
import { Photo } from '@/types';
import { useInvalidatePhotos } from '@/hooks';
import { useFormSubmit } from '@/lib/form/useFormSubmit';
import { type, type Type } from 'arktype';

export function useBatchActions() {
  const { state, clear } = useSelection();
  const invalidatePhotos = useInvalidatePhotos();

  const { submit: runBatchDelete, isLoading: isDeleting } = useFormSubmit({
    schema: type('unknown'),
    mutationFn: async () => {
      const res = await batchService.delete(state.selectedIds);
      if (!res.success) throw new Error(res.error || '刪除失敗');
      return true;
    },
    onSuccess: () => {
      invalidatePhotos();
      clear();
    },
    successMessage: `已刪除 ${state.selectedIds.length} 張照片`,
    errorMessage: '批次刪除失敗'
  });

  const { submit: runBatchUpdate, isLoading: isUpdating } = useFormSubmit({
    schema: type({
      'category_id?': 'string | null',
      'manufacturer_id?': 'string | null',
      'group_id?': 'string | null',
    }) as unknown as Type<Partial<Photo>>,
    mutationFn: async (data: Partial<Photo>) => {
      const res = await batchService.update(state.selectedIds, data);
      if (!res.success) throw new Error(res.error || '更新失敗');
      return true;
    },
    onSuccess: () => {
      invalidatePhotos();
      clear();
    },
    successMessage: `已更新 ${state.selectedIds.length} 張照片`,
    errorMessage: '批次更新失敗'
  });

  const { submit: runBatchTag, isLoading: isTagging } = useFormSubmit({
    schema: type('string[]') as unknown as Type<string[]>,
    mutationFn: async (tagIds: string[]) => {
      const res = await batchService.addTags(state.selectedIds, tagIds);
      if (!res.success) throw new Error(res.error || '新增標籤失敗');
      return true;
    },
    onSuccess: () => {
      invalidatePhotos();
      clear();
    },
    successMessage: `已為 ${state.selectedIds.length} 張照片新增標籤`,
    errorMessage: '批次新增標籤失敗'
  });

  return {
    batchDelete: { mutate: runBatchDelete, mutateAsync: runBatchDelete, isPending: isDeleting },
    batchUpdate: { mutate: runBatchUpdate, mutateAsync: runBatchUpdate, isPending: isUpdating },
    batchTag: { mutate: runBatchTag, mutateAsync: runBatchTag, isPending: isTagging },
    isPending: isDeleting || isUpdating || isTagging,
    selectedCount: state.selectedIds.length,
  };
}
