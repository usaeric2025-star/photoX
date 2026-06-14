import { createQuery } from '@/lib/query/queryFactory';
import { loadManufacturersFromCloud } from '@/services/manufacturer/queries';
import { queryKeys } from '@/lib/query/keys';
import { syncCache } from '@/lib/db/indexedDB';
import { Manufacturer } from '@/types';

/**
 * Hook to get the list of manufacturers using standard query factory.
 */
export const useManufacturers = createQuery<Manufacturer[]>({
  queryKey: () => queryKeys.manufacturers.manufacturers(),
  queryFn: async () => {
    const mfrs = await loadManufacturersFromCloud();
    syncCache.saveManufacturers(mfrs).catch(() => {});
    return mfrs;
  },
  staleTime: 24 * 60 * 60 * 1000, // Infinity-like for mfrs
});
