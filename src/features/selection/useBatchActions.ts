import { useCallback } from 'react';
import { batchService } from './batchService';
import { useSelection } from './SelectionContext';
import { Photo } from '@/types';
import { useInvalidatePhotos } from '@/hooks';
import { useFormSubmit } from '@/lib/form/useFormSubmit';
import * as v from 'valibot';

export function useBatchActions() {
  const { state, clear } = useSelection();
  const invalidatePhotos = useInvalidatePhotos();

  const { submit: runBatchDelete, isLoading: isDeleting } = useFormSubmit({
    schema: v.unknown(),
    mutationFn: async () => {
      const res = await batchService.delete(state.selectedIds);
      if (!res.success) throw new Error(String(res.error || '删除失败'));
      return true;
    },
    onSuccess: () => {
      invalidatePhotos();
      clear();
    },
    successMessage: `已删除 ${state.selectedIds.length} 张照片`,
    errorMessage: '批量删除失败'
  });

  const BatchUpdateSchema = v.partial(v.object({
    category_id: v.nullable(v.string()),
    manufacturer_id: v.nullable(v.string()),
    group_id: v.nullable(v.string()),
  }));
  type BatchUpdateData = v.InferOutput<typeof BatchUpdateSchema>;

  const { submit: runBatchUpdate, isLoading: isUpdating } = useFormSubmit({
    schema: BatchUpdateSchema,
    mutationFn: async (data: BatchUpdateData) => {
      const res = await batchService.update(state.selectedIds, data);
      if (!res.success) throw new Error(String(res.error || '更新失败'));
      return true;
    },
    onSuccess: () => {
      invalidatePhotos();
      clear();
    },
    successMessage: `已更新 ${state.selectedIds.length} 张照片`,
    errorMessage: '批量更新失败'
  });

  const { submit: runBatchTag, isLoading: isTagging } = useFormSubmit({
    schema: v.array(v.string()),
    mutationFn: async (tagIds: string[]) => {
      const res = await batchService.addTags(state.selectedIds, tagIds);
      if (!res.success) throw new Error(String(res.error || '添加标签失败'));
      return true;
    },
    onSuccess: () => {
      invalidatePhotos();
      clear();
    },
    successMessage: `已为 ${state.selectedIds.length} 张照片添加标签`,
    errorMessage: '批量添加标签失败'
  });

  return {
    batchDelete: { mutate: runBatchDelete, mutateAsync: runBatchDelete, isPending: isDeleting },
    batchUpdate: { mutate: runBatchUpdate, mutateAsync: runBatchUpdate, isPending: isUpdating },
    batchTag: { mutate: runBatchTag, mutateAsync: runBatchTag, isPending: isTagging },
    isPending: isDeleting || isUpdating || isTagging,
    selectedCount: state.selectedIds.length,
  };
}
