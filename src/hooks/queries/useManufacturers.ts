import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { loadManufacturersFromCloud } from '../../services/manufacturerService';
import { QUERY_KEYS } from './keys';
import { syncCache } from '../../utils/indexedDB';

export const useManufacturersQuery = () => {
  const result = useQuery({
    queryKey: QUERY_KEYS.manufacturers,
    queryFn: async () => {
      const mfrs = await loadManufacturersFromCloud();
      syncCache.saveManufacturers(mfrs).catch(() => {});
      return mfrs;
    },
    placeholderData: keepPreviousData,
  });
  return { ...result, data: result.data ?? [] };
};
