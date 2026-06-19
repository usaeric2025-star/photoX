import { useMutation } from '@tanstack/react-query';
import { batchService } from './batchService';
import { useSelection } from './SelectionContext';
import { showToast } from '@/lib/ui/toast';
import { Photo } from '@/types';
import { handleError } from '@/lib/error/errorHandler';
import { useInvalidatePhotos } from '@/hooks';

export function useBatchActions() {
  const { state, clear } = useSelection();
  const invalidatePhotos = useInvalidatePhotos();

  const batchDelete = useMutation({
    mutationFn: async () => {
      const res = await batchService.delete(state.selectedIds);
      if (!res.success) throw new Error(res.error || '刪除失敗');
      return res;
    },
    onSuccess: () => {
      showToast.success(`已刪除 ${state.selectedIds.length} 張照片`);
      invalidatePhotos();
      clear();
    },
    onError: (error: Error) => {
      handleError(error, '批次刪除');
    },
  });

  const batchUpdate = useMutation({
    mutationFn: async (data: Partial<Photo>) => {
      const res = await batchService.update(state.selectedIds, data);
      if (!res.success) throw new Error(res.error || '更新失敗');
      return res;
    },
    onSuccess: () => {
      showToast.success(`已更新 ${state.selectedIds.length} 張照片`);
      invalidatePhotos();
      clear();
    },
    onError: (error: Error) => {
      handleError(error, '批次更新');
    },
  });

  const batchTag = useMutation({
    mutationFn: async (tagIds: string[]) => {
      const res = await batchService.addTags(state.selectedIds, tagIds);
      if (!res.success) throw new Error(res.error || '新增標籤失敗');
      return res;
    },
    onSuccess: () => {
      showToast.success(`已為 ${state.selectedIds.length} 張照片新增標籤`);
      invalidatePhotos();
      clear();
    },
    onError: (error: Error) => {
      handleError(error, '批次新增標籤');
    },
  });

  return {
    batchDelete,
    batchUpdate,
    batchTag,
    isPending: batchDelete.isPending || batchUpdate.isPending || batchTag.isPending,
    selectedCount: state.selectedIds.length,
  };
}
