import { queryKeys } from '#lib/query/keys.js';
import { useAppMutation, appQuery } from '#lib/query/index.js';

export const useSyncMutation = () => useAppMutation({
  mutationFn: async (type: 'push' | 'pull') => {
    if (type === 'pull') {
      appQuery.mutate((key) => {
        if (!key) return false;
        const keyStr = typeof key === 'string' ? key : JSON.stringify(key);
        return keyStr.includes('photos') || 
               keyStr.includes('groups') || 
               keyStr.includes('tags') || 
               keyStr.includes('categories') || 
               keyStr.includes('manufacturers');
      });
    }
  },
});
