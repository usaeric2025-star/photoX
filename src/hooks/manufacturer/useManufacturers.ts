import { Manufacturer } from '#src/types/index.js';
import { useAppQuery } from '#lib/query/index.js';
import { loadManufacturersFromCloud } from '#src/services/manufacturer/queries.js';
import { queryKeys } from '#lib/query/keys.js';
import { STALE_TIMES } from '#lib/query/config.js';

export function useManufacturers() {
  const { data, isLoading, error, mutate } = useAppQuery<Manufacturer[]>(
    queryKeys.manufacturers.all,
    loadManufacturersFromCloud,
    {
      dedupingInterval: STALE_TIMES.LONG,
    }
  );

  return {
    manufacturers: data || [],
    isLoading,
    error,
    mutate,
  };
}
