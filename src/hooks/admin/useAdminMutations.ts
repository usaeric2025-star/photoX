import { photoKeys, groupKeys, tagKeys, categoryKeys, manufacturerKeys } from '@/lib/queryKeys';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { api } from '@/lib/api';
import { defineMutation } from '@/lib/mutations/defineMutation';
import { useAppMutation } from '@/lib/mutations/useAppMutation';

const repairConfig = defineMutation<any, string>({
  service: async (issueId: string) => {
    const res = await api.admin.repair.$post({ json: { issueId } });
    if (!res.ok) {
        const errorData = await res.json() as any;
        throw ErrorFactory.wrap(new Error(errorData?.error || `HTTP ${res.status}`), 'runRepair', issueId);
    }
    return res.json() as any;
  },
  invalidate: () => [photoKeys.all as any, groupKeys.all as any],
  successMessage: '修复成功',
});
export const useRepairMutation = () => useAppMutation(repairConfig);

const syncConfig = defineMutation<void, 'push' | 'pull'>({
  service: async (type: 'push' | 'pull') => {
    if (type === 'pull') {
      const { queryClient } = await import('@/lib/queryClient');
      await queryClient.invalidateQueries({ queryKey: [tagKeys.tags()] });
      await queryClient.invalidateQueries({ queryKey: [categoryKeys.categories()] });
      await queryClient.invalidateQueries({ queryKey: [manufacturerKeys.manufacturers()] });
      await queryClient.invalidateQueries({ queryKey: [groupKeys.all] });
      await queryClient.invalidateQueries({ queryKey: photoKeys.all as any });
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
