import { useCallback } from 'react';
import { appQuery } from '@/lib/query';
import { queryKeys } from '@/lib/query/keys';

export const useInvalidatePhotos = () => {
  const invalidatePhotos = useCallback(() => {
    // 依据架构规则：使用 photoKeys.all 进行降维打击，清空全域缓存
    return appQuery.mutate(
      (key) => Array.isArray(key) && key[0] === queryKeys.photos.all[0]
    );
  }, []);

  return invalidatePhotos;
};
