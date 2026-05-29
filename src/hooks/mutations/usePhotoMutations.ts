import { useMutation, useQueryClient } from '@tanstack/react-query';
import { photoKeys } from '@/lib/queryKeys';
import * as photos from '@/services/photos';
import { useFeedback } from '@/hooks/shared/useFeedback';
import type { Photo } from '@/types';
import { isErr } from '@/lib/errorFactory';

export function usePhotoMutations() {
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useFeedback();

  const deletePhoto = useMutation({
    mutationFn: (ids: string[]) => photos.deleteMany(ids),
    onSuccess: (result) => {
      if (isErr(result)) {
        showError(result.error, '删除失败');
        return;
      }
      queryClient.invalidateQueries({ queryKey: photoKeys.all });
      showSuccess('删除成功');
    },
    onError: (err) => showError(err as Error, '删除失败'),
  });

  const updatePhoto = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Photo> }) =>
      photos.update(id, updates),
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

  const batchUpdate = useMutation({
    mutationFn: ({ ids, updates }: { ids: string[]; updates: Partial<Photo> }) =>
      photos.batchUpdate(ids, updates),
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

  return { deletePhoto, updatePhoto, batchUpdate };
}
