import { createQuery } from './core/queryFactory';
import { loadManufacturersFromCloud } from '@/services/manufacturer/queries';
import { manufacturerKeys } from '@/lib/queryKeys';
import { syncCache } from '@/lib/db/indexedDB';
import { Manufacturer } from '../types';

/**
 * Hook to get the list of manufacturers using standard query factory.
 */
export const useManufacturers = createQuery<Manufacturer[]>({
  queryKey: () => manufacturerKeys.manufacturers(),
  queryFn: async () => {
    const mfrs = await loadManufacturersFromCloud();
    syncCache.saveManufacturers(mfrs).catch(() => {});
    return mfrs;
  },
  staleTime: 24 * 60 * 60 * 1000, // Infinity-like for mfrs
});
