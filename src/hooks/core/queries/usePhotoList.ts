import { createStaleTime } from '@/shared/freshnessSchema';
import { useQuery } from '@tanstack/react-query';
import { loadPhotosByGroupId } from '@/services/photo/queries';
import { photoKeys } from '@/lib/queryKeys';

/**
 * Hook to get a list of photos (regular query).
 * Currently used for group photo lists.
 */
export const usePhotoList = (groupId: string, isAdminMode: boolean = false) => {
  return useQuery({
    queryKey: photoKeys.group(groupId),
    queryFn: () => loadPhotosByGroupId(groupId, isAdminMode),
    enabled: !!groupId,
    select: (data) => data ?? [],
    staleTime: createStaleTime('STABLE'),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};
