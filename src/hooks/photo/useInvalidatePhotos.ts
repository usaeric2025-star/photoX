import { useCallback } from 'react';
import { queryClient } from '#lib/query/index.js';
import { queryKeys } from '#lib/query/keys.js';

export const useInvalidatePhotos = () => {
  const invalidatePhotos = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: queryKeys.photos.all });
  }, []);

  return invalidatePhotos;
};
