import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getPhotoById as loadPhotoById } from '@/services/photo/queries/detail';
import { photoKeys } from '@/lib/queryKeys';
import { Photo } from '@/types';

/**
 * Hook to get detailed photo information.
 */
export const usePhoto = (photoId: string) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: photoKeys.detail(photoId),
    queryFn: async () => {
      const res = await loadPhotoById(photoId);
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
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
        // Find if we have a detailed cache state
        const detailState = queryClient.getQueryState(photoKeys.detail(photoId));
        if (detailState?.dataUpdatedAt) {
            return detailState.dataUpdatedAt;
        }
        
        // Find the newest updated time from the photos list
        const cachedPhotos = queryClient.getQueriesData<any>({ queryKey: photoKeys.all });
        let latestUpdates = 0;
        for (const [key, data] of cachedPhotos) {
            const state = queryClient.getQueryState(key);
            if (state?.dataUpdatedAt && state.dataUpdatedAt > latestUpdates) {
                latestUpdates = state.dataUpdatedAt;
            }
        }
        return latestUpdates > 0 ? latestUpdates : undefined;
    },
    staleTime: 0, // Always ensure we fetch the latest when opening
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

