import { useGroupDetail as useGroupDetailService } from '@/services/group/groupService';

/**
 * Hook to get group details using service layer.
 */
export const useGroupDetail = (
  props: string | null | { groupId: string | null, isAdmin?: boolean },
  isAdmin?: boolean
) => {
  const groupId = typeof props === 'string' ? props : (props as { groupId: string | null })?.groupId;
  const isAdm = typeof props === 'string' ? isAdmin : (props as { isAdmin?: boolean })?.isAdmin;

  const { group, isLoading, error, mutate } = useGroupDetailService(groupId, isAdm);

  return {
    data: group,
    isLoading,
    error,
    refetch: mutate,
  };
};
