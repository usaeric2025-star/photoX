import { createMutationHook } from '@/hooks/_factory/createMutationHook';
import { useQueryClient } from '@tanstack/react-query';
import { useInvalidatePhotos } from '@/hooks';

export const useSyncMutation = () => {
  const queryClient = useQueryClient();
  const invalidatePhotos = useInvalidatePhotos();

  return createMutationHook({
    entity: 'Sync',
    action: 'Run',
    mutationFn: async (type: 'push' | 'pull') => {
      if (type === 'pull') {
        invalidatePhotos();
        await queryClient.invalidateQueries({ queryKey: ['tags'] });
        await queryClient.invalidateQueries({ queryKey: ['categories'] });
        await queryClient.invalidateQueries({ queryKey: ['manufacturers'] });
        await queryClient.invalidateQueries({ queryKey: ['groups'] });
      }
    },
    onSuccessMessage: '同步完成',
  })();
};
