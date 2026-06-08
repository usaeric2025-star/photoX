import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { photoKeys } from '@/lib/queryKeys';

export const useInvalidatePhotos = () => {
  const queryClient = useQueryClient();

  const invalidatePhotos = useCallback(() => {
    // 依据架构规则：使用 photoKeys.all 进行降维打击，清空全域缓存
    return queryClient.invalidateQueries({ queryKey: photoKeys.all });
  }, [queryClient]);

  return invalidatePhotos;
};
