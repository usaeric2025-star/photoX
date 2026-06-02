import { useMutation, useQueryClient } from '@tanstack/react-query';
import { photoKeys } from '@/lib/queryKeys';
import { deleteMany } from '@/services/photo/commands';
import { useErrorHandler } from '@/hooks';
import { toast } from '@/lib/ui/toast';
import { isErr } from '@/lib/errorFactory';

export function usePhotoDelete() {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: (ids: string[]) => deleteMany(ids),
    onSuccess: (result) => {
      if (isErr(result)) {
        handleError(result.error, '删除失败');
        return;
      }
      queryClient.invalidateQueries({ queryKey: photoKeys.all });
      toast.success('删除成功');
    },
    onError: (err) => handleError(err as Error, '删除操作遇到错误，请检查网络或权限'),
  });
}
