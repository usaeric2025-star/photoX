import { STALE_TIMES } from '#lib/query/config';
import { useAppQuery as useQuery } from '#lib/query';
import { queryKeys } from '#lib/query/keys';
import { Photo } from '#src/types';
import { SupabasePhotoRaw } from '#src/types/supabase';
import { api } from '#lib/api';
import { mapSupabasePhoto } from '#src/services/mappers/photo';

/**
 * Hook to get detailed photo information.
 */
export const usePhoto = (photoId: string | null | undefined) => {
  return useQuery(
    photoId ? queryKeys.photos.detail(photoId) : null,
    async () => {
      if (!photoId) return null;
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

