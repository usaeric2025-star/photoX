import { Manufacturer } from '@/types';
import { useAppQuery } from '@/lib/query';
import { loadManufacturersFromCloud } from '@/services/manufacturer/queries';
import { queryKeys } from '@/lib/query/keys';
import { STALE_TIMES } from '@/lib/query/config';

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
