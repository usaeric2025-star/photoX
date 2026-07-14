import { useAppQuery } from '#lib/query/index.js';
import { queryKeys } from '#lib/query/keys.js';
import { STALE_TIMES } from '#lib/query/config.js';
import { GroupService } from './service.js';

/**
 * useGroupDetail
 * 
 * 獲取單個群組的詳細信息。
 */
export function useGroupDetail(id: string | null, isAdmin = false) {
  const { data: group, isLoading, error } = useAppQuery(
    id ? queryKeys.groups.detail(id, isAdmin) : null,
    async () => {
      if (!id) return null;
      return GroupService.getById(id, isAdmin ? 'admin' : 'public');
    },
    {
      staleTime: STALE_TIMES.LONG,
    }
  );

  return { group, isLoading, error };
}
