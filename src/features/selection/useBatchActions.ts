import { useMutation, useQueryClient } from '@tanstack/react-query';
import { batchService } from './batchService';
import { useSelection } from './SelectionContext';
import { toast } from 'sonner';
import { Photo } from '@/types';

export function useBatchActions() {
  const { state, clear } = useSelection();
  const queryClient = useQueryClient();

  const batchDelete = useMutation({
    mutationFn: async () => {
      const res = await batchService.delete(state.selectedIds);
      if (!res.success) throw new Error(res.error || '刪除失敗');
      return res;
    },
    onSuccess: () => {
      toast.success(`已刪除 ${state.selectedIds.length} 張照片`);
      queryClient.invalidateQueries({ queryKey: ['photos'] });
      clear();
    },
    onError: (error: Error) => {
      toast.error('批次刪除失敗', { description: error.message });
    },
  });

  const batchUpdate = useMutation({
    mutationFn: async (data: Partial<Photo>) => {
      const res = await batchService.update(state.selectedIds, data);
      if (!res.success) throw new Error(res.error || '更新失敗');
      return res;
    },
    onSuccess: () => {
      toast.success(`已更新 ${state.selectedIds.length} 張照片`);
      queryClient.invalidateQueries({ queryKey: ['photos'] });
      clear();
    },
    onError: (error: Error) => {
      toast.error('批次更新失敗', { description: error.message });
    },
  });

  const batchTag = useMutation({
    mutationFn: async (tagIds: string[]) => {
      const res = await batchService.addTags(state.selectedIds, tagIds);
      if (!res.success) throw new Error(res.error || '新增標籤失敗');
      return res;
    },
    onSuccess: () => {
      toast.success(`已為 ${state.selectedIds.length} 張照片新增標籤`);
      queryClient.invalidateQueries({ queryKey: ['photos'] });
      clear();
    },
    onError: (error: Error) => {
      toast.error('批次新增標籤失敗', { description: error.message });
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
