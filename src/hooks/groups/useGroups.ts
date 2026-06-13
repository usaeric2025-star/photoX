import { createQuery } from '@/lib/query/queryFactory';
import { loadGroupsFromCloud } from '@/services/group/queries';
import { groupKeys } from '@/lib/queryKeys';
import { Group } from '@/types';

/**
 * Hook to get the list of groups using standard query factory.
 */
export const useGroups = createQuery<Group[], { userId: string, isAdmin?: boolean }>({
  queryKey: ({ userId, isAdmin }) => [...groupKeys.list(userId), isAdmin],
  queryFn: async ({ userId, isAdmin }) => {
    const result = await loadGroupsFromCloud(userId, isAdmin);
    if (!result.ok) throw new Error(result.message || '加载分组失败');
    return result.data || [];
  }
});
