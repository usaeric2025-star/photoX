import { useTags as useTagsService } from '@/services/tag/tagService';

/**
 * Hook to get the list of tags.
 */
export function useTags() {
  const { tags, isLoading, error } = useTagsService();
  return { data: tags, isPending: isLoading, error };
}

