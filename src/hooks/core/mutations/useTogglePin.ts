import { useMutation, useQueryClient } from '@tanstack/react-query';
import { photoKeys } from '@/lib/queryKeys';
import { Photo } from '@/types';
import { useFeedback } from '@/hooks';

const optimisticTogglePin = (oldData: any, photoId: string) => {
  if (!oldData) return oldData;
  return {
    ...oldData,
    pages: oldData.pages.map((page: any) => ({
      ...page,
      data: page.data.map((p: any) =>
        p.id === photoId ? { ...p, is_pinned: !p.is_pinned } : p
      )
    }))
  };
};

export const useTogglePin = (photo: Photo, updatePhoto: (id: string, updates: Partial<Photo>) => Promise<void>) => {
  const queryClient = useQueryClient();
  const { handleError } = useFeedback();
  
  return useMutation({
    mutationFn: () => updatePhoto(photo.id, { is_pinned: !photo.is_pinned }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: photoKeys.all });
      const previous = queryClient.getQueryData(photoKeys.all);
      queryClient.setQueryData(photoKeys.all, (old: any) => 
        optimisticTogglePin(old, photo.id)
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(photoKeys.all, context?.previous);
      handleError(_err, '置頂操作失敗');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: photoKeys.all });
    },
  });
};
