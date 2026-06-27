import { createQuery } from '@/lib/query/queryFactory';
import { loadGroupsFromCloud } from '@/services/group/queries';
import { queryKeys } from '@/lib/query/keys';
import { Group } from '@/types';
import * as v from 'valibot';
import { GroupSchema } from '@/lib/valibot';

/**
 * Hook to get the list of groups using standard query factory.
 */
export const useGroups = createQuery<Group[], { userId: string, isAdmin?: boolean }>({
  queryKey: ({ userId, isAdmin }) => queryKeys.groups.list({ userId, isAdmin: !!isAdmin }),
  queryFn: async ({ userId, isAdmin }) => {
    const result = await loadGroupsFromCloud(userId, isAdmin);
    return result || [];
  },
  schema: v.array(GroupSchema)
});
