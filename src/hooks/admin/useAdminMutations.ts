import { queryKeys } from '#lib/query/keys.js';
import { useAppMutation, queryClient } from '#lib/query/index.js';

export const useSyncMutation = () => useAppMutation({
  mutationFn: async (type: 'push' | 'pull') => {
    if (type === 'pull') {
      queryClient.invalidateQueries();
    }
  },
});
