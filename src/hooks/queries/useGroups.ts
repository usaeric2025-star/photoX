import { createStaleTime } from '@/shared/freshnessSchema';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { loadGroupsFromCloud, getGroupById } from '../../services/groupService';
import { groupKeys } from '../../lib/queryKeys';

export const useGroupsQuery = (userId: string) => {
  return useQuery({
    queryKey: groupKeys.list(),
    queryFn: () => loadGroupsFromCloud(userId),
    placeholderData: keepPreviousData,
  });
};

export const useGroupDetailQuery = (groupId: string | null) => {
  return useQuery({
    queryKey: groupId ? groupKeys.detail(groupId) : ['groups', 'detail', null],
    queryFn: () => getGroupById(groupId!),
    enabled: !!groupId,
    placeholderData: keepPreviousData,
    staleTime: createStaleTime('STABLE'), // 5 minutes cache
  });
};

