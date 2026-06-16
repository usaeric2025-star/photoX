import { createQuery } from '@/lib/query/queryFactory';
import { loadManufacturersFromCloud } from '@/services/manufacturer/queries';
import { queryKeys } from '@/lib/query/keys';
import { Manufacturer } from '@/types';

/**
 * Hook to get the list of manufacturers using standard query factory.
 */
export const useManufacturers = createQuery<Manufacturer[]>({
  queryKey: () => queryKeys.manufacturers.manufacturers(),
  queryFn: async () => {
    return await loadManufacturersFromCloud();
  },
  staleTime: 24 * 60 * 60 * 1000, // Infinity-like for mfrs
});
