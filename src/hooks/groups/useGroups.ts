import { useGroups as useGroupService } from '@/services/group/groupService';

/**
 * Hook to get the list of groups using standard query factory.
 */
export const useGroups = (userId: string, isAdmin?: boolean) => {
  const { groups, isLoading, error, mutate } = useGroupService(userId, isAdmin);

  return {
    data: groups,
    isLoading,
    error,
    refetch: mutate,
  };
};
