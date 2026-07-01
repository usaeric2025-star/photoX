import { useCallback } from 'react';
import { appQuery } from '#lib/query';
import { queryKeys } from '#lib/query/keys';

export const useInvalidatePhotos = () => {
  const invalidatePhotos = useCallback(() => {
    return appQuery.invalidatePhotos();
  }, []);

  return invalidatePhotos;
};
