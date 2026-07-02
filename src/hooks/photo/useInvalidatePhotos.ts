import { useCallback } from 'react';
import { appQuery } from '#lib/query/index.js';
import { queryKeys } from '#lib/query/keys.js';

export const useInvalidatePhotos = () => {
  const invalidatePhotos = useCallback(() => {
    return appQuery.invalidatePhotos();
  }, []);

  return invalidatePhotos;
};
