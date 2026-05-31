import { useMutation, useQueryClient } from '@tanstack/react-query';
import { photoKeys } from '@/lib/queryKeys';
import { deleteMany } from '@/services/photo/commands';
import { useFeedback } from '@/hooks';
import { isErr } from '@/lib/errorFactory';

export function usePhotoDelete() {
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useFeedback();

  return useMutation({
    mutationFn: (ids: string[]) => deleteMany(ids),
    onSuccess: (result) => {
      if (isErr(result)) {
        showError(result.error, '删除失败');
        return;
      }
      queryClient.invalidateQueries({ queryKey: photoKeys.all });
      showSuccess('删除成功');
    },
    onError: (err) => showError(err as Error, '删除操作遇到错误，请检查网络或权限'),
  });
}
