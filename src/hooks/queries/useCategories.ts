import { useQuery } from '@tanstack/react-query';
import { loadCategoriesFromCloud } from '../../services/categoryService';
import { QUERY_KEYS } from './keys';

export const useCategoriesQuery = () => {
  const result = useQuery({
    queryKey: QUERY_KEYS.categories,
    queryFn: loadCategoriesFromCloud,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
  return { ...result, data: result.data ?? [] };
};
