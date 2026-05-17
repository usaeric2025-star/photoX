import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { loadTagsFromCloud } from '../../services/tagService';
import { QUERY_KEYS } from './keys';

export const useTagsQuery = () => {
  const result = useQuery({
    queryKey: QUERY_KEYS.tags,
    queryFn: loadTagsFromCloud,
    staleTime: 1000 * 60 * 10, // 10 minutes
    placeholderData: keepPreviousData,
  });
  return { ...result, data: result.data ?? [] };
};
