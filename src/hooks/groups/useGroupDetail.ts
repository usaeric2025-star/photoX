import { createQuery } from '@/lib/query/queryFactory';
import { getGroupById } from '@/services/group/queries';
import { queryKeys } from '@/lib/query/keys';
import { Group } from '@/types';

/**
 * Hook to get group details using standard query factory.
 */
export const useGroupDetail = createQuery<Group | null, { groupId: string | null, isAdmin?: boolean }>({
  queryKey: ({ groupId, isAdmin }) => groupId ? queryKeys.groups.detail(groupId, !!isAdmin) : ['groups', 'detail', null],
  queryFn: async ({ groupId, isAdmin }) => {
    if (!groupId) return null;
    const result = await getGroupById(groupId, isAdmin ? 'admin' : 'public');
    return result || null;
  }
});
