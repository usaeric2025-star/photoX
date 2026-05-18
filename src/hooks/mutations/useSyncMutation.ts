import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { QUERY_KEYS } from '../queries/keys';

export const useSyncMutation = () => {
  const queryClient = useQueryClient();
  
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
      toast.error(`同步失败: ${err.message}`);
    }
  });
};
