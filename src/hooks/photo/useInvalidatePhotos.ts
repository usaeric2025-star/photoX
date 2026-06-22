import { useCallback } from 'react';
import { useAppQueryClient as useQueryClient } from '@/lib/query';
import { queryKeys } from '@/lib/query/keys';

export const useInvalidatePhotos = () => {
  const queryClient = useQueryClient();

  const invalidatePhotos = useCallback(() => {
    // 依据架构规则：使用 photoKeys.all 进行降维打击，清空全域缓存
    return queryClient.invalidateQueries({ queryKey: queryKeys.photos.all });
  }, [queryClient]);

  return invalidatePhotos;
};
