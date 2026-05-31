import { useMutation, useQueryClient } from '@tanstack/react-query';
import { photoKeys } from '@/lib/queryKeys';
import { update } from '@/services/photo/commands';
import { useFeedback } from '@/hooks';
import { Photo } from '@/types';
import { isErr } from '@/lib/errorFactory';

export function usePhotoEdit() {
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useFeedback();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Photo> }) =>
      update(id, updates),
    onSuccess: (result) => {
      if (isErr(result)) {
        showError(result.error, '更新失败');
        return;
      }
      queryClient.invalidateQueries({ queryKey: photoKeys.all });
      showSuccess('更新成功');
    },
    onError: (err) => showError(err as Error, '更新失败'),
  });
}
