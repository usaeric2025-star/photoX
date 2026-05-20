import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useFeedback, useInvalidatePhotos } from '@/hooks';

export const useSyncMutation = () => {
  const queryClient = useQueryClient();
  const { handleError } = useFeedback();
  const invalidatePhotos = useInvalidatePhotos();
  
  return useMutation({
    mutationFn: async (type: 'push' | 'pull') => {
      if (type === 'pull') {
        invalidatePhotos();
        await queryClient.invalidateQueries({ queryKey: ['tags'] });
        await queryClient.invalidateQueries({ queryKey: ['categories'] });
        await queryClient.invalidateQueries({ queryKey: ['manufacturers'] });
        await queryClient.invalidateQueries({ queryKey: ['groups'] });
      }
    },
    onError: (err: any) => {
      handleError(err, '同步失败');
    }
  });
};
