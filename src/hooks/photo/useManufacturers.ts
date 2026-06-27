import { STALE_TIMES } from '@/lib/query/config';
import { createQuery } from '@/lib/query/queryFactory';
import { loadManufacturersFromCloud } from '@/services/manufacturer/queries';
import { queryKeys } from '@/lib/query/keys';
import { Manufacturer } from '@/types';
import * as v from 'valibot';
import { ManufacturerSchema } from '@/lib/valibot';

/**
 * Hook to get the list of manufacturers using standard query factory.
 */
export const useManufacturers = createQuery<Manufacturer[]>({
  queryKey: () => queryKeys.manufacturers.manufacturers(),
  queryFn: async () => {
    return await loadManufacturersFromCloud();
  },
  schema: v.array(ManufacturerSchema),
  staleTime: STALE_TIMES.INFINITY
});
