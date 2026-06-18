import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import { Photo } from '@/types';
import { api } from '@/lib/api';

/**
 * Hook to get detailed photo information.
 */
export const usePhoto = (photoId: string) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.photos.detail(photoId),
    queryFn: async () => {
      const response = await api.photos['by-ids'].$post({
        json: { ids: [photoId] }
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      return result.data[0] as Photo;
    },
    enabled: !!photoId,
    initialData: () => {
      // 1. Try to find in detail cache
      const detailed = queryClient.getQueryData<Photo>(queryKeys.photos.detail(photoId));
      if (detailed) return detailed;

      // 2. Try to find in any infinite list query cache
      const cachedPhotos = queryClient.getQueriesData<any>({ queryKey: queryKeys.photos.all });
      for (const [, data] of cachedPhotos) {
        if (data && data.pages) {
          for (const page of data.pages) {
            // Updated to search in 'items' as per unified PhotoListItem structure
            if (page.items) {
              const photo = page.items.find((p: any) => p.id === photoId);
              if (photo) return photo as Photo;
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
  });
};

