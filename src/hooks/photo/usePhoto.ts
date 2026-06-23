import { STALE_TIMES } from '@/lib/query/config';
import { useAppQuery as useQuery } from '@/lib/query';
import { queryKeys } from '@/lib/query/keys';
import { Photo } from '@/types';
import { SupabasePhotoRaw } from '@/types/supabase';
import { api } from '@/lib/api';
import { mapSupabasePhoto } from '@/services/mappers/photo';

/**
 * Hook to get detailed photo information.
 */
export const usePhoto = (photoId: string) => {
  return useQuery(
    queryKeys.photos.detail(photoId),
    async () => {
      const response = await api.photos['by-ids'].$post({
        json: { ids: [photoId] }
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      const rawData = result.data[0] as SupabasePhotoRaw;
      return rawData ? mapSupabasePhoto(rawData) : null;
    },
    {
      dedupingInterval: STALE_TIMES.REALTIME,
    }
  );
};

