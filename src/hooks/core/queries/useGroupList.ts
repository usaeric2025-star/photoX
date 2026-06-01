import { createStaleTime } from '@/shared/freshnessSchema';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { loadGroupsFromCloud } from '@/services/group/queries';
import { groupKeys } from '@/lib/queryKeys';
import { isErr } from '@/lib/errorFactory';

/**
 * Hook to get the list of groups.
 */
export const useGroupList = (userId: string) => {
  return useQuery({
    queryKey: groupKeys.list(),
    queryFn: async () => {
      const result = await loadGroupsFromCloud(userId);
      if (!result.ok) throw result;
      return result.data;
    },
    select: (data) => data ?? [],
    staleTime: createStaleTime('STABLE'),
    placeholderData: keepPreviousData,
  });
};
