import { createStaleTime } from '@/shared/freshnessSchema';
import { useQuery } from '@tanstack/react-query';
import { getGroupById } from '@/services/group/queries';
import { groupKeys } from '@/lib/queryKeys';
import { isErr } from '@/lib/errorFactory';

/**
 * Hook to get group details.
 */
export const useGroupDetail = (groupId: string | null) => {
  return useQuery({
    queryKey: groupId ? groupKeys.detail(groupId) : ['groups', 'detail', null],
    queryFn: async () => {
      const result = await getGroupById(groupId!);
      if (isErr(result)) throw result.error;
      return result.value;
    },
    enabled: !!groupId,
    staleTime: createStaleTime('STABLE'),
  });
};
