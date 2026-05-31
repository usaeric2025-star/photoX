import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { loadManufacturersFromCloud } from '@/services/manufacturer/queries';
import { photoKeys } from '@/lib/queryKeys';
import { syncCache } from '@/lib/db/indexedDB';

/**
 * Hook to get the list of manufacturers.
 */
export const useManufacturerList = () => {
  const result = useQuery({
    queryKey: photoKeys.manufacturers(),
    queryFn: async () => {
      const mfrs = await loadManufacturersFromCloud();
      syncCache.saveManufacturers(mfrs).catch(() => {});
      return mfrs;
    },
    placeholderData: keepPreviousData,
  });
  return { ...result, data: result.data ?? [] };
};
