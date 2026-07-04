import { useCallback } from 'react';
import { queryClient } from '#lib/query/index.js';
import { queryKeys } from '#lib/query/keys.js';

/**
 * Unified hook for invalidating photo-related query caches.
 * Ensures consistent data updates across the application.
 */
export const useInvalidatePhotos = () => {
  const invalidateList = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.photos.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
  }, []);

  const invalidateDetail = useCallback((photoId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.photos.detail(photoId) });
    queryClient.invalidateQueries({ queryKey: ['photos', 'ai-result', photoId] });
  }, []);

  const invalidateTags = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
  }, []);

  const invalidateCategories = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
  }, []);

  const invalidateAll = useCallback(() => {
    invalidateList();
    invalidateTags();
    invalidateCategories();
  }, [invalidateList, invalidateTags, invalidateCategories]);

  return {
    invalidateList,
    invalidateDetail,
    invalidateTags,
    invalidateCategories,
    invalidateAll
  };
};
