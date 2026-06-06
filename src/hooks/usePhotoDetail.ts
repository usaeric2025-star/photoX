import { useQuery, useQueryClient } from '@tanstack/react-query';
import { loadPhotoById } from '@/services/photo/detail';
import { photoKeys } from '@/lib/queryKeys';
import { Photo } from '@/types';

/**
 * Hook to get detailed photo information.
 */
export const usePhotoDetail = (photoId: string) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: photoKeys.detail(photoId),
    queryFn: () => loadPhotoById(photoId),
    enabled: !!photoId,
    initialData: () => {
      // 1. Try to find in detail cache
      const detailed = queryClient.getQueryData<Photo>(photoKeys.detail(photoId));
      if (detailed) return detailed;

      // 2. Try to find in any infinite list query cache
      const cachedPhotos = queryClient.getQueriesData<any>({ queryKey: photoKeys.all });
      for (const [key, data] of cachedPhotos) {
        if (data && data.pages) {
          for (const page of data.pages) {
            if (page.photos) {
              const photo = page.photos.find((p: Photo) => p.id === photoId);
              if (photo) return photo;
            }
          }
        }
      }
      return undefined;
    },
    initialDataUpdatedAt: () => {
        return queryClient.getQueryState(photoKeys.detail(photoId))?.dataUpdatedAt;
    }
  });
};

