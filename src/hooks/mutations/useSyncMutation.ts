import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useErrorHandler } from '../../utils/errorHandler';
import { QUERY_KEYS } from '../queries/keys';

export const useSyncMutation = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();
  
  return useMutation({
    mutationFn: async (type: 'push' | 'pull') => {
      // Logic from useSyncEngine.refreshCloudData
      // Need to handle implementation here
      if (type === 'pull') {
        await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.photos });
        await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tags });
        await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
        await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.manufacturers });
        await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groups });
      }
    },
    onError: (err: any) => {
      handleError(err, '同步失败');
    }
  });
};
