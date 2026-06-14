import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { getPhotoById as loadPhotoById } from '@/services/photo/queries/detail';
import { queryKeys } from '@/lib/query/keys';
import { Photo } from '@/types';

/**
 * Hook to get detailed photo information.
 */
export const usePhoto = (photoId: string, options?: Partial<UseQueryOptions<Photo | null>>) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.photos.detail(photoId),
    queryFn: async () => {
      return await loadPhotoById(photoId);
    },
    enabled: !!photoId,
    initialData: () => {
      // 1. Try to find in detail cache
      const detailed = queryClient.getQueryData<Photo>(queryKeys.photos.detail(photoId));
      if (detailed) return detailed;

      // 2. Try to find in any infinite list query cache
      const cachedPhotos = queryClient.getQueriesData<any>({ queryKey: queryKeys.photos.all });
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
        const detailState = queryClient.getQueryState(queryKeys.photos.detail(photoId));
        if (detailState?.dataUpdatedAt) {
            return detailState.dataUpdatedAt;
        }
        
        // Find the newest updated time from the photos list
        const cachedPhotos = queryClient.getQueriesData<any>({ queryKey: queryKeys.photos.all });
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
    ...options
  });
};

