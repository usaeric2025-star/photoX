import { queryKeys } from '#lib/query/keys';
import { getGroupById } from '#src/services/group/queries';
import { useAppQuery } from '#lib/query';
import { STALE_TIMES } from '#lib/query/config';

export function useGroupDetail(id: string, isAdmin = false) {
  const { data: group, isLoading, error } = useAppQuery(
    id ? queryKeys.groups.detail(id, isAdmin) : null,
    async () => {
      return getGroupById(id, isAdmin ? 'admin' : 'public');
    },
    {
      dedupingInterval: STALE_TIMES.LONG,
    }
  );

  return {
    group,
    isLoading,
    error
  };
}
