import { ProductGroup } from '@/types';
import { useAppQuery } from '@/lib/query';
import { loadGroupsFromCloud, getGroupById } from '@/services/group/queries';
import { queryKeys } from '@/lib/query/keys';
import { STALE_TIMES } from '@/lib/query/config';

export function useGroups(userId: string, isAdmin: boolean = false) {
  const { data, isLoading, error, mutate } = useAppQuery<ProductGroup[]>(
    [queryKeys.groups.all, userId, isAdmin],
    () => loadGroupsFromCloud(userId, isAdmin),
    {
      dedupingInterval: STALE_TIMES.MEDIUM,
    }
  );

  return {
    groups: data || [],
    isLoading,
    error,
    mutate,
  };
}

export function useGroupDetail(groupId: string | null, isAdmin: boolean = false) {
  const { data, isLoading, error, mutate } = useAppQuery<ProductGroup | undefined>(
    groupId ? [queryKeys.groups.detail(groupId, isAdmin), isAdmin] : null,
    async () => {
      const group = await getGroupById(groupId!, isAdmin ? 'admin' : 'public');
      return group || undefined;
    },
    {
      dedupingInterval: STALE_TIMES.SHORT,
    }
  );

  return {
    group: data,
    isLoading,
    error,
    mutate,
  };
}
