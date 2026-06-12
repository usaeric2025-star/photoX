import { createQuery } from '@/lib/query/queryFactory';
import { getGroupById } from '@/services/group/queries';
import { groupKeys } from '@/lib/queryKeys';
import { Group } from '@/types';

/**
 * Hook to get group details using standard query factory.
 */
export const useGroupDetail = createQuery<Group | null, string | null>({
  queryKey: (groupId) => groupId ? groupKeys.detail(groupId) : ['groups', 'detail', null],
  queryFn: async (groupId) => {
    if (!groupId) return null;
    const result = await getGroupById(groupId);
    if (!result.ok) throw result;
    return result.data || null;
  }
});
