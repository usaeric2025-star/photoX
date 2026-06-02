import { useMutation, useQueryClient } from '@tanstack/react-query';
import { photoKeys } from '@/lib/queryKeys';
import { batchUpdate } from '@/services/photo/commands';
import { useErrorHandler } from '@/hooks';
import { toast } from '@/lib/ui/toast';
import { Photo } from '@/types';
import { isErr } from '@/lib/errorFactory';

export function usePhotoBatchEdit() {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: ({ ids, updates }: { ids: string[]; updates: Partial<Photo> }) =>
      batchUpdate(ids, updates),
    onSuccess: (result) => {
      if (isErr(result)) {
        handleError(result.error, '批量更新失败');
        return;
      }
      queryClient.invalidateQueries({ queryKey: photoKeys.all });
      toast.success('批量更新成功');
    },
    onError: (err) => handleError(err as Error, '批量更新失败'),
  });
}
