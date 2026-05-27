import { createStaleTime } from '@/shared/freshnessSchema';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { loadGroupsFromCloud, getGroupById } from '../../services/groupService';
import { QUERY_KEYS } from './keys';

export const useGroupsQuery = (userId: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.groups,
    queryFn: () => loadGroupsFromCloud(userId),
    placeholderData: keepPreviousData,
  });
};

export const useGroupDetailQuery = (groupId: string | null) => {
  return useQuery({
    queryKey: ['group', groupId],
    queryFn: () => getGroupById(groupId!),
    enabled: !!groupId,
    staleTime: createStaleTime('STABLE'), // 5 minutes cache
  });
};

