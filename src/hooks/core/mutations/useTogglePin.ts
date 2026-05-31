import { useMutation, useQueryClient } from '@tanstack/react-query';
import { photoKeys } from '@/lib/queryKeys';
import { Photo } from '@/types';
import { useFeedback } from '@/hooks';

export const useTogglePin = (photo: Photo, updatePhoto: (id: string, updates: Partial<Photo>) => Promise<void>) => {
  const queryClient = useQueryClient();
  const { handleError } = useFeedback();
  
  return useMutation({
    mutationFn: () => updatePhoto(photo.id, { is_pinned: !photo.is_pinned }),
    onError: (_err) => {
      handleError(_err, '置頂操作失敗');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: photoKeys.all });
    },
  });
};
