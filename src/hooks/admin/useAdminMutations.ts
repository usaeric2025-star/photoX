import { queryKeys } from '@/lib/query/keys';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { api } from '@/lib/api';
import { defineMutation } from '@/lib/mutations/defineMutation';
import { useAppMutation } from '@/lib/mutations/useAppMutation';

const repairConfig = defineMutation<any, string>({
  name: 'repair',
  service: async (issueId: string) => {
    const res = await api.admin.repair.$post({ json: { issueId } });
    if (!res.ok) {
        const errorData = await res.json() as any;
        throw ErrorFactory.wrap(new Error(errorData?.error || `HTTP ${res.status}`), 'runRepair', issueId);
    }
    return res.json() as any;
  },
  invalidate: () => [queryKeys.photos.all as any, queryKeys.groups.all as any],
  successMessage: '修复成功',
});
export const useRepairMutation = () => useAppMutation(repairConfig);

const syncConfig = defineMutation<void, 'push' | 'pull'>({
  name: 'sync',
  service: async (type: 'push' | 'pull') => {
    if (type === 'pull') {
      const { queryClient } = await import('@/lib/queryClient');
      await queryClient.invalidateQueries({ queryKey: [queryKeys.tags.tags()] });
      await queryClient.invalidateQueries({ queryKey: [queryKeys.categories.categories()] });
      await queryClient.invalidateQueries({ queryKey: [queryKeys.manufacturers.manufacturers()] });
      await queryClient.invalidateQueries({ queryKey: [queryKeys.groups.all] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.photos.all as any });
    }
  },
  successMessage: '同步完成',
});
export const useSyncMutation = () => useAppMutation(syncConfig);

export const useAdminMutations = () => {
  const repair = useRepairMutation();
  return {
    useRepairMutation: () => repair,
  };
};
