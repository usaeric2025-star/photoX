import { STALE_TIMES } from '@/lib/query/config';
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
  staleTime: STALE_TIMES.INFINITY
});
