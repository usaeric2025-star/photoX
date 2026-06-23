import { queryKeys } from '@/lib/query/keys';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { api } from '@/lib/api';
import { defineMutation } from '@/lib/mutations/defineMutation';
import { useOptimisticMutation } from '@/lib/mutations/useOptimisticMutation';
import { appQuery } from '@/lib/query';

// 1. 修复工具
const repairConfig = defineMutation<unknown, string, readonly unknown[]>({
  name: 'repair',
  service: async (issueId) => {
    const res = await api.admin.repair.$post({ json: { issueId } });
    if (!res.ok) {
        const errorData = await res.json() as { error?: string };
        throw ErrorFactory.wrap(new Error(errorData?.error || `HTTP ${res.status}`), 'runRepair', issueId);
    }
    return await res.json();
  },
  invalidate: () => [queryKeys.photos.all, queryKeys.groups.all],
  successMessage: '修复成功',
});
export const useRepairMutation = () => useOptimisticMutation(repairConfig);

// 2. 同步工具
const syncConfig = defineMutation<void, 'push' | 'pull', readonly unknown[]>({
  name: 'sync',
  service: async (type) => {
    if (type === 'pull') {
      await appQuery.mutate(queryKeys.tags.all);
      await appQuery.mutate(queryKeys.categories.all);
      await appQuery.mutate(queryKeys.manufacturers.all);
      await appQuery.mutate(queryKeys.groups.all);
      await appQuery.mutate(queryKeys.photos.all);
    }
  },
  successMessage: '同步完成',
});
export const useSyncMutation = () => useOptimisticMutation(syncConfig);


export const useAdminMutations = () => {
  const repair = useRepairMutation();
  const sync = useSyncMutation();
  return {
    repair,
    sync,
  };
};
