import { queryKeys } from '@/lib/query/keys';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { api } from '@/lib/api';
import { useAppMutation, appQuery } from '@/lib/query';

// 1. 修复工具
export const useRepairMutation = () => useAppMutation({
  mutationFn: async (issueId: string) => {
    const res = await api.admin.maintenance.repair.$post({ json: { issueId } });
    if (!res.ok) {
        const errorData = await res.json() as { error?: string };
        throw ErrorFactory.wrap(new Error(errorData?.error || `HTTP ${res.status}`), 'runRepair', issueId);
    }
    return await res.json();
  },
  onSuccess: () => {
    appQuery.mutate((key) => {
      if (!key) return false;
      const keyStr = typeof key === 'string' ? key : JSON.stringify(key);
      return keyStr.includes('photos') || keyStr.includes('groups');
    });
  }
});

// 2. 同步工具
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


export const useAdminMutations = () => {
  const repair = useRepairMutation();
  const sync = useSyncMutation();
  return {
    repair,
    sync,
  };
};
