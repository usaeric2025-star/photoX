import { STALE_TIMES } from '@/lib/query/config';
import { useQuery, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import { Photo } from '@/types';
import { SupabasePhotoRaw } from '@/types/supabase';
import { PhotoListItem } from '@/types/api';
import { api } from '@/lib/api';
import { mapSupabasePhoto } from '@/services/mappers/photo';

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
      const rawData = result.data[0] as SupabasePhotoRaw;
      return rawData ? mapSupabasePhoto(rawData) : null;
    },
    enabled: !!photoId,
    initialData: () => {
      // 1. Try to find in detail cache
      const detailed = queryClient.getQueryData<Photo | null>(queryKeys.photos.detail(photoId));
      if (detailed) return detailed;

      // 2. Try to find in any infinite list query cache
      const cachedPhotos = queryClient.getQueriesData<InfiniteData<{ items: PhotoListItem[] }>>({ queryKey: queryKeys.photos.all });
      for (const [, data] of cachedPhotos) {
        if (data && data.pages) {
          for (const page of data.pages) {
            if (page.items) {
              const photo = page.items.find((p) => p.id === photoId);
              if (photo) return mapSupabasePhoto(photo as unknown as SupabasePhotoRaw); 
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
        const cachedPhotos = queryClient.getQueriesData<InfiniteData<{ items: PhotoListItem[] }>>({ queryKey: queryKeys.photos.all });
        let latestUpdates = 0;
        for (const [key, data] of cachedPhotos) {
            const state = queryClient.getQueryState(key);
            if (state?.dataUpdatedAt && state.dataUpdatedAt > latestUpdates) {
                latestUpdates = state.dataUpdatedAt;
            }
        }
        return latestUpdates > 0 ? latestUpdates : undefined;
    },
    staleTime: STALE_TIMES.REALTIME,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

