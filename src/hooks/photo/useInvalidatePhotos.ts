import { useCallback } from 'react';
import { appQuery } from '@/lib/query';
import { queryKeys } from '@/lib/query/keys';

export const useInvalidatePhotos = () => {
  const invalidatePhotos = useCallback(() => {
    // 依据架构规则：使用 photoKeys.all 进行降维打击，清空全域缓存
    // SWRInfinite keys might be serialized strings starting with $inf$
    return appQuery.mutate(
      (key) => {
        if (!key) return false;
        const keyStr = typeof key === 'string' ? key : JSON.stringify(key);
        return keyStr.includes('photos');
      }
    );
  }, []);

  return invalidatePhotos;
};
