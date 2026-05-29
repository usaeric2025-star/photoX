import { createStaleTime } from '@/shared/freshnessSchema';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { loadGroupsFromCloud, getGroupById } from '../../services/groups';
import { groupKeys } from '../../lib/queryKeys';
import { isErr } from '@/lib/errorFactory';

export const useGroupsQuery = (userId: string) => {
  return useQuery({
    queryKey: groupKeys.list(),
    queryFn: async () => {
      const result = await loadGroupsFromCloud(userId);
      if (isErr(result)) throw result.error;
      return result.value;
    },
    placeholderData: keepPreviousData,
  });
};

export const useGroupDetailQuery = (groupId: string | null) => {
  return useQuery({
    queryKey: groupId ? groupKeys.detail(groupId) : ['groups', 'detail', null],
    queryFn: async () => {
      const result = await getGroupById(groupId!);
      if (isErr(result)) throw result.error;
      return result.value;
    },
    enabled: !!groupId,
    staleTime: createStaleTime('STABLE'), // 5 minutes cache
  });
};

