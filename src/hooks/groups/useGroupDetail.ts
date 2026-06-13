import { createQuery } from '@/lib/query/queryFactory';
import { getGroupById } from '@/services/group/queries';
import { groupKeys } from '@/lib/queryKeys';
import { Group } from '@/types';

/**
 * Hook to get group details using standard query factory.
 */
export const useGroupDetail = createQuery<Group | null, { groupId: string | null, isAdmin?: boolean }>({
  queryKey: ({ groupId, isAdmin }) => groupId ? [...groupKeys.detail(groupId), isAdmin] : ['groups', 'detail', null],
  queryFn: async ({ groupId, isAdmin }) => {
    if (!groupId) return null;
    const result = await getGroupById(groupId, isAdmin ? 'admin' : 'public');
    if (!result.ok) throw result;
    return result.data || null;
  }
});
