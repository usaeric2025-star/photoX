import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { loadManufacturersFromCloud } from '../../services/manufacturerService';
import { QUERY_KEYS } from './keys';

export const useManufacturersQuery = () => {
  const result = useQuery({
    queryKey: QUERY_KEYS.manufacturers,
    queryFn: loadManufacturersFromCloud,
    placeholderData: keepPreviousData,
  });
  return { ...result, data: result.data ?? [] };
};
