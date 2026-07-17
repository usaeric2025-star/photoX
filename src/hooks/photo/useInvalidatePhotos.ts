import { useCallback } from 'react';
import { queryClient } from '#lib/query/index.js';
import { queryKeys } from '#lib/query/keys.js';

/**
 * useInvalidatePhotos
 * 
 * 全局快取失效調度中心。
 */
export function useInvalidatePhotos() {
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

  const invalidateManufacturers = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.manufacturers.all });
  }, []);

  const invalidateAll = useCallback(() => {
    invalidateList();
    invalidateTags();
    invalidateCategories();
    invalidateManufacturers();
    queryClient.invalidateQueries({ queryKey: queryKeys.diagnostics.all });
  }, [invalidateList, invalidateTags, invalidateCategories, invalidateManufacturers]);

  return {
    invalidateList,
    invalidateDetail,
    invalidateTags,
    invalidateCategories,
    invalidateManufacturers,
    invalidateAll
  };
}
