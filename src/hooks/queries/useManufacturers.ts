import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { loadManufacturersFromCloud } from '../../services/manufacturers';
import { photoKeys } from '../../lib/queryKeys';
import { syncCache } from '../../utils/indexedDB';

export const useManufacturersQuery = () => {
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
