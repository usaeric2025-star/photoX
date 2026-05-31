import { useMutation, useQueryClient } from '@tanstack/react-query';
import { photoKeys } from '@/lib/queryKeys';
import { batchUpdate } from '@/services/photo/commands';
import { useFeedback } from '@/hooks';
import { Photo } from '@/types';
import { isErr } from '@/lib/errorFactory';

export function usePhotoBatchEdit() {
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useFeedback();

  return useMutation({
    mutationFn: ({ ids, updates }: { ids: string[]; updates: Partial<Photo> }) =>
      batchUpdate(ids, updates),
    onSuccess: (result) => {
      if (isErr(result)) {
        showError(result.error, '批量更新失败');
        return;
      }
      queryClient.invalidateQueries({ queryKey: photoKeys.all });
      showSuccess('批量更新成功');
    },
    onError: (err) => showError(err as Error, '批量更新失败'),
  });
}
