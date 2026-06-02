import { useMutation, useQueryClient } from '@tanstack/react-query';
import { photoKeys } from '@/lib/queryKeys';
import { update } from '@/services/photo/commands';
import { useErrorHandler } from '@/hooks';
import { toast } from '@/lib/ui/toast';
import { Photo } from '@/types';
import { isErr } from '@/lib/errorFactory';

export function usePhotoEdit() {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Photo> }) =>
      update(id, updates),
    onSuccess: (result) => {
      if (isErr(result)) {
        handleError(result.error, '更新失败');
        return;
      }
      queryClient.invalidateQueries({ queryKey: photoKeys.all });
      toast.success('更新成功');
    },
    onError: (err) => handleError(err as Error, '更新失败'),
  });
}
