import useSWR from 'swr';
import { loadManufacturersFromCloud } from './queries';
import { queryKeys } from '@/lib/query/keys';
import { Manufacturer } from '@/types';

export function useManufacturers() {
  const { data, error, isLoading, mutate } = useSWR<Manufacturer[], any>(
    queryKeys.manufacturers.all,
    loadManufacturersFromCloud,
    {}
  );

  return {
    manufacturers: data || [],
    isLoading,
    error,
    mutate,
  };
}
