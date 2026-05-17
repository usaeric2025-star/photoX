import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { loadGroupsFromCloud } from '../../services/groupService';
import { QUERY_KEYS } from './keys';

export const useGroupsQuery = (userId: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.groups,
    queryFn: () => loadGroupsFromCloud(userId),
    placeholderData: keepPreviousData,
  });
};
