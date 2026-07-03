import { STALE_TIMES } from '#lib/query/config.js';
import { useAppQuery as useQuery } from '#lib/query/index.js';
import { queryKeys } from '#lib/query/keys.js';
import { Photo } from '#src/types/index.js';
import { SupabasePhotoRaw } from '#src/types/supabase.js';
import { api } from '#lib/api.js';
import { mapSupabasePhoto } from '#src/services/mappers/photo.js';

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
      staleTime: STALE_TIMES.REALTIME,
    }
  );
};

