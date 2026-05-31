import { useQuery } from '@tanstack/react-query';
import { loadPhotoById } from '@/services/photo/detail';
import { photoKeys } from '@/lib/queryKeys';

/**
 * Hook to get detailed photo information.
 */
export const usePhotoDetail = (photoId: string) => {
  return useQuery({
    queryKey: photoKeys.detail(photoId),
    queryFn: () => loadPhotoById(photoId),
    enabled: !!photoId,
  });
};
