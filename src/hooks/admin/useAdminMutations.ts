import { queryKeys } from '@/lib/query/keys';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { api } from '@/lib/api';
import { useAppMutation, appQuery } from '@/lib/query';

// 1. 修复工具
export const useRepairMutation = () => useAppMutation({
  mutationFn: async (issueId: string) => {
    const res = await api.admin.repair.$post({ json: { issueId } });
    if (!res.ok) {
        const errorData = await res.json() as { error?: string };
        throw ErrorFactory.wrap(new Error(errorData?.error || `HTTP ${res.status}`), 'runRepair', issueId);
    }
    return await res.json();
  },
  onSuccess: () => {
      appQuery.mutate(queryKeys.photos.all);
      appQuery.mutate(queryKeys.groups.all);
  }
});

// 2. 同步工具
export const useSyncMutation = () => useAppMutation({
  mutationFn: async (type: 'push' | 'pull') => {
    if (type === 'pull') {
      await appQuery.mutate(queryKeys.tags.all);
      await appQuery.mutate(queryKeys.categories.all);
      await appQuery.mutate(queryKeys.manufacturers.all);
      await appQuery.mutate(queryKeys.groups.all);
      await appQuery.mutate((key) => Array.isArray(key) && key[0] === queryKeys.photos.all[0]);
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
