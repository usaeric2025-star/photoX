import { createQuery } from './core/queryFactory';
import { loadGroupsFromCloud } from '@/services/group/queries';
import { groupKeys } from '@/lib/queryKeys';
import { Group } from '../types';

/**
 * Hook to get the list of groups using standard query factory.
 */
export const useGroups = createQuery<Group[], string>({
  queryKey: (userId) => groupKeys.list(userId),
  queryFn: async (userId) => {
    const result = await loadGroupsFromCloud(userId);
    if (!result.ok) throw new Error(result.message || '加载分组失败');
    return result.data || [];
  }
});
