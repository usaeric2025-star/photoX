import { queryKeys } from '#lib/query/keys.js';
import { getGroupById } from '#src/services/group/queries.js';
import { useAppQuery } from '#lib/query/index.js';
import { STALE_TIMES } from '#lib/query/config.js';

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
